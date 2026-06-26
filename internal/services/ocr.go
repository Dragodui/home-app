package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Dragodui/diploma-server/internal/logger"
	"github.com/Dragodui/diploma-server/internal/metrics"
	"github.com/Dragodui/diploma-server/internal/models"
)

const (
	geminiTimeout      = 60 * time.Second
	geminiBaseURL      = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent"
	geminiMaxRetries   = 3
	geminiMaxImageSide = 2000
	geminiJPEGQuality  = 85
)

var ErrOCRTemporarilyUnavailable = errors.New("OCR service is temporarily unavailable")

type OCRService struct {
	geminiAPIKey string
	httpClient   *http.Client
}

type IOCRService interface {
	ProcessFile(ctx context.Context, filePath, language string) (*models.OCRResult, error)
}

func NewOCRService(geminiAPIKey string) *OCRService {
	return &OCRService{
		geminiAPIKey: geminiAPIKey,
		httpClient: &http.Client{
			Timeout: geminiTimeout,
		},
	}
}

// ProcessFile processes a local file with Gemini Vision API
func (s *OCRService) ProcessFile(ctx context.Context, filePath, language string) (*models.OCRResult, error) {
	start := time.Now()

	imageData, err := os.ReadFile(filePath)
	if err != nil {
		metrics.OcrRequestsTotal.WithLabelValues("error").Inc()
		metrics.OcrProcessingDuration.Observe(time.Since(start).Seconds())
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	mimeType := detectMimeType(filePath)
	imageData, mimeType = optimizeImageForGemini(imageData, mimeType)

	result, err := s.analyzeWithGemini(ctx, imageData, mimeType, language)
	duration := time.Since(start).Seconds()
	metrics.OcrProcessingDuration.Observe(duration)
	if err != nil {
		metrics.OcrRequestsTotal.WithLabelValues("error").Inc()
		return nil, fmt.Errorf("Gemini Vision failed: %w", err)
	}

	metrics.OcrRequestsTotal.WithLabelValues("success").Inc()

	strResult, _ := json.Marshal(result)
	logger.Info.Printf("OCR Result: %s", string(strResult))

	return result, nil
}

// Gemini API request/response types
type geminiRequest struct {
	Contents         []geminiContent        `json:"contents"`
	GenerationConfig geminiGenerationConfig `json:"generationConfig"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text       string        `json:"text,omitempty"`
	InlineData *geminiInline `json:"inlineData,omitempty"`
}

type geminiInline struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type geminiGenerationConfig struct {
	ResponseMimeType string `json:"responseMimeType"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (s *OCRService) analyzeWithGemini(ctx context.Context, imageData []byte, mimeType, language string) (*models.OCRResult, error) {
	languageHint := "Detect the language automatically."
	if language != "" {
		// Whitelist allowed languages to prevent prompt injection
		allowedLanguages := map[string]bool{
			"english": true, "spanish": true, "french": true, "german": true,
			"italian": true, "portuguese": true, "russian": true, "chinese": true,
			"japanese": true, "korean": true, "arabic": true, "hindi": true,
			"dutch": true, "polish": true, "swedish": true, "norwegian": true,
			"danish": true, "finnish": true, "czech": true, "turkish": true,
			"greek": true, "hebrew": true, "thai": true, "vietnamese": true,
			"ukrainian": true, "romanian": true, "hungarian": true, "belarusian": true,
		}
		langLower := strings.ToLower(language)
		if !allowedLanguages[langLower] {
			return nil, fmt.Errorf("unsupported language: %s", language)
		}
		languageHint = fmt.Sprintf("The text is likely in %s.", langLower)
	}

	prompt := "Analyze this receipt/bill image. " + languageHint + "\n" +
		"Extract the following data and return ONLY valid JSON (no markdown, no code fences):\n" +
		"{\n" +
		"  \"vendor\": \"store or company name\",\n" +
		"  \"date\": \"date from receipt in original format\",\n" +
		"  \"total\": 0.00,\n" +
		"  \"items\": [\n" +
		"    {\"name\": \"item name\", \"quantity\": 1, \"price\": 0.00}\n" +
		"  ],\n" +
		"  \"raw_text\": \"all visible text from the image\"\n" +
		"}\n\n" +
		"Rules:\n" +
		"- \"total\" must be a number (float), not a string\n" +
		"- \"price\" is the total price for that line item (quantity * unit price)\n" +
		"- If you cannot determine a field, use empty string for strings, 0 for numbers, [] for items\n" +
		"- Do NOT wrap the response in markdown code blocks"

	reqBody := geminiRequest{
		Contents: []geminiContent{
			{
				Parts: []geminiPart{
					{
						InlineData: &geminiInline{
							MimeType: mimeType,
							Data:     base64.StdEncoding.EncodeToString(imageData),
						},
					},
					{
						Text: prompt,
					},
				},
			},
		},
		GenerationConfig: geminiGenerationConfig{
			ResponseMimeType: "application/json",
		},
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	apiURL := fmt.Sprintf("%s?key=%s", geminiBaseURL, s.geminiAPIKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.doGeminiRequestWithRetry(ctx, req, jsonBody)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		if isRetryableGeminiStatus(resp.StatusCode) {
			return nil, fmt.Errorf("%w: Gemini returned status %d after retries", ErrOCRTemporarilyUnavailable, resp.StatusCode)
		}
		return nil, fmt.Errorf("Gemini API returned status %d: %s", resp.StatusCode, truncateForLog(string(body), 1000))
	}

	var geminiResp geminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to decode Gemini response: %w", err)
	}

	if geminiResp.Error != nil {
		return nil, fmt.Errorf("Gemini API error: %s", geminiResp.Error.Message)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, errors.New("empty response from Gemini API")
	}

	resultText := geminiResp.Candidates[0].Content.Parts[0].Text

	var result models.OCRResult
	if err := json.Unmarshal([]byte(resultText), &result); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini JSON output: %w (raw: %s)", err, resultText)
	}

	result.Confidence = calculateGeminiConfidence(&result)

	return &result, nil
}

func (s *OCRService) doGeminiRequestWithRetry(ctx context.Context, originalReq *http.Request, body []byte) (*http.Response, error) {
	var lastErr error

	for attempt := 0; attempt <= geminiMaxRetries; attempt++ {
		if attempt > 0 {
			if err := sleepWithBackoff(ctx, attempt); err != nil {
				return nil, err
			}
		}

		req := originalReq.Clone(ctx)
		req.Body = io.NopCloser(bytes.NewReader(body))
		req.ContentLength = int64(len(body))

		resp, err := s.httpClient.Do(req)
		if err != nil {
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			lastErr = err
			continue
		}

		if !isRetryableGeminiStatus(resp.StatusCode) || attempt == geminiMaxRetries {
			return resp, nil
		}

		_, _ = io.Copy(io.Discard, resp.Body)
		resp.Body.Close()
		lastErr = fmt.Errorf("Gemini returned retryable status %d", resp.StatusCode)
	}

	return nil, fmt.Errorf("%w: %v", ErrOCRTemporarilyUnavailable, lastErr)
}

func isRetryableGeminiStatus(statusCode int) bool {
	switch statusCode {
	case http.StatusTooManyRequests, http.StatusInternalServerError, http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout:
		return true
	default:
		return false
	}
}

func sleepWithBackoff(ctx context.Context, attempt int) error {
	delays := []time.Duration{500 * time.Millisecond, 1500 * time.Millisecond, 3500 * time.Millisecond}
	delay := delays[min(attempt-1, len(delays)-1)]

	timer := time.NewTimer(delay)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func optimizeImageForGemini(data []byte, mimeType string) ([]byte, string) {
	if mimeType == "application/pdf" || !strings.HasPrefix(mimeType, "image/") {
		return data, mimeType
	}

	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		logger.Warn.Printf("OCR image optimization skipped: %v", err)
		return data, mimeType
	}

	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	if width <= 0 || height <= 0 {
		return data, mimeType
	}

	if width > geminiMaxImageSide || height > geminiMaxImageSide {
		img = resizeNearest(img, width, height, geminiMaxImageSide)
	}

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: geminiJPEGQuality}); err != nil {
		logger.Warn.Printf("OCR image compression skipped: %v", err)
		return data, mimeType
	}

	if buf.Len() >= len(data) && width <= geminiMaxImageSide && height <= geminiMaxImageSide {
		return data, mimeType
	}

	logger.Info.Printf("OCR image optimized: %d bytes -> %d bytes", len(data), buf.Len())
	return buf.Bytes(), "image/jpeg"
}

func resizeNearest(src image.Image, width, height, maxSide int) image.Image {
	if width >= height {
		height = max(1, height*maxSide/width)
		width = maxSide
	} else {
		width = max(1, width*maxSide/height)
		height = maxSide
	}

	dst := image.NewRGBA(image.Rect(0, 0, width, height))
	srcBounds := src.Bounds()
	for y := 0; y < height; y++ {
		srcY := srcBounds.Min.Y + y*srcBounds.Dy()/height
		for x := 0; x < width; x++ {
			srcX := srcBounds.Min.X + x*srcBounds.Dx()/width
			dst.Set(x, y, src.At(srcX, srcY))
		}
	}

	return dst
}

func truncateForLog(value string, maxLen int) string {
	if len(value) <= maxLen {
		return value
	}
	return value[:maxLen] + "...(truncated)"
}

func calculateGeminiConfidence(result *models.OCRResult) float64 {
	score := 0.0
	checks := 4.0

	if result.Vendor != "" {
		score++
	}
	if result.Date != "" {
		score++
	}
	if result.Total > 0 {
		score++
	}
	if len(result.Items) > 0 {
		score++

		// Bonus check: items total vs overall total
		checks++
		itemsTotal := 0.0
		for _, item := range result.Items {
			itemsTotal += item.Price
		}
		if result.Total > 0 && itemsTotal > 0 {
			diff := itemsTotal - result.Total
			if diff < 0 {
				diff = -diff
			}
			if diff/result.Total < 0.1 {
				score++
			}
		}
	}

	return score / checks
}

func detectMimeType(filePath string) string {
	switch strings.ToLower(filepath.Ext(filePath)) {
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".bmp":
		return "image/bmp"
	case ".pdf":
		return "application/pdf"
	default:
		return "image/jpeg"
	}
}
