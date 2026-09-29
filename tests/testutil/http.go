// Package testutil holds helpers shared by the test packages under tests/.
package testutil

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func MakeJSONRequest(method, url string, body interface{}) *http.Request {
	var reqBody []byte
	if body != nil {
		reqBody, _ = json.Marshal(body)
	}
	req := httptest.NewRequest(method, url, bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	return req
}

func AssertJSONResponse(t *testing.T, rr *httptest.ResponseRecorder, expectedStatus int, shouldContain string) {
	t.Helper()
	assert.Equal(t, expectedStatus, rr.Code)
	if shouldContain != "" {
		assert.Contains(t, rr.Body.String(), shouldContain)
	}
}
