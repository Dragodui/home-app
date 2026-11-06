import { Camera, File, FileText, type LucideIcon } from "lucide-react-native";
import type { FC } from "react";
import { Image, TouchableOpacity, View } from "react-native";
import {
  Button,
  Card,
  ChipSelect,
  InfoRow,
  ListItem,
  Section,
  Text,
  TextLink,
  useControlSurface,
} from "@/components/ui";
import { formatCurrencyAmount } from "@/lib/currency";
import type { OCRResult } from "@/lib/types";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";
import { OCR_LANGUAGES } from "./budget-utils";
import ReceiptItems from "./receipt-items";

function ScanOption({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  const { theme } = useTheme();
  const surface = useControlSurface();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      className="flex-1 py-6 rounded-xl justify-center items-center gap-2"
      style={{ backgroundColor: surface, borderStyle: "dashed", borderWidth: 1, borderColor: theme.border }}
      onPress={onPress}
    >
      <Icon size={28} color={theme.textSecondary} />
      <Text variant="label" color="secondary" className="text-center">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface ReceiptScannerProps {
  fileUri: string | null;
  fileType: "image" | "pdf" | null;
  fileName: string | null;
  scanning: boolean;
  ocrResult: OCRResult | null;
  language: string;
  currency: string;
  onTakePhoto: () => void;
  onPickFile: () => void;
  onReset: () => void;
  onRetryWithLanguage: (language: string) => void;
}

const ReceiptScanner: FC<ReceiptScannerProps> = ({
  fileUri,
  fileType,
  fileName,
  scanning,
  ocrResult,
  language,
  currency,
  onTakePhoto,
  onPickFile,
  onReset,
  onRetryWithLanguage,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <Section compact title={t.budget.scanReceipt}>
      {!fileUri ? (
        <View className="flex-row gap-3">
          <ScanOption icon={Camera} label={t.budget.takePhoto} onPress={onTakePhoto} />
          <ScanOption icon={File} label={t.budget.uploadReceipt} onPress={onPickFile} />
        </View>
      ) : (
        <>
          {fileType === "pdf" ? (
            <ListItem
              singleLine
              left={<FileText size={32} color={theme.accent.pink} />}
              title={fileName || "document.pdf"}
              subtitle={t.budget.pdf}
              className="mb-3"
            />
          ) : (
            <View className="rounded-xl overflow-hidden mb-3" style={{ borderWidth: 1, borderColor: theme.border }}>
              <Image source={{ uri: fileUri }} style={{ width: "100%", height: 160 }} resizeMode="cover" />
            </View>
          )}

          <TextLink subtle title={t.budget.changePhoto} onPress={onReset} className="self-center mb-3" />

          {!ocrResult && scanning && <Button title={t.budget.processing} onPress={() => {}} loading disabled />}

          {ocrResult && (
            <>
              <ChipSelect options={OCR_LANGUAGES} value={language} onChange={onRetryWithLanguage} className="mb-3" />

              <Card size="sm">
                <Text variant="overline" className="mb-1">
                  {t.budget.scanResults}
                </Text>
                {ocrResult.vendor && <InfoRow label={t.budget.vendor} value={ocrResult.vendor} />}
                {ocrResult.date && <InfoRow label={t.budget.date} value={ocrResult.date} />}
                {ocrResult.items && ocrResult.items.length > 0 && (
                  <ReceiptItems
                    items={ocrResult.items}
                    currency={currency}
                    title={`${t.budget.items} (${ocrResult.items.length})`}
                  />
                )}
                {ocrResult.total > 0 && (
                  <InfoRow label={t.common.total} value={formatCurrencyAmount(ocrResult.total, currency)} />
                )}
              </Card>
            </>
          )}
        </>
      )}
    </Section>
  );
};

export default ReceiptScanner;
