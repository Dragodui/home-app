import { Fragment } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Rect, Text as SvgText } from "react-native-svg";
import { Text } from "@/components/ui";
import { toChartColor } from "@/constants/glass-theme";
import { useTheme } from "@/stores/themeStore";

export const DonutChart = ({
  data,
  size = 180,
  strokeWidth = 20,
  total,
  totalLabel,
}: {
  data: { value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  total: number;
  totalLabel: string;
}) => {
  const { theme } = useTheme();
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -90;

  return (
    <View className="justify-center items-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {total > 0 &&
          data.map((item, index) => {
            const percentage = item.value / total;
            const strokeLength = circumference * percentage;
            const angle = percentage * 360;

            const circle = (
              <Circle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                stroke={toChartColor(item.color, index, theme)}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={[strokeLength, circumference]}
                strokeDashoffset={0}
                rotation={currentAngle}
                origin={`${center}, ${center}`}
                strokeLinecap="round"
              />
            );

            currentAngle += angle;
            return circle;
          })}
      </Svg>
      <View className="absolute justify-center items-center">
        <Text variant="title">{total % 1 === 0 ? total.toFixed(0) : total.toFixed(2)}</Text>
        <Text variant="caption" color="secondary">
          {totalLabel}
        </Text>
      </View>
    </View>
  );
};

export const BarChart = ({
  data,
  width = 300,
  height = 240,
}: {
  data: { month: string; total: number }[];
  width?: number;
  height?: number;
}) => {
  const { theme } = useTheme();
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const barWidth = Math.min(32, (width - 40) / data.length - 8);
  const chartHeight = height - 40;
  const barSpacing = (width - 20) / data.length;

  return (
    <Svg width={width} height={height}>
      <Line x1={10} y1={chartHeight} x2={width - 10} y2={chartHeight} stroke={theme.border} strokeWidth={1} />
      {data.map((item, i) => {
        const barH = (item.total / maxVal) * (chartHeight - 20);
        const x = 10 + i * barSpacing + (barSpacing - barWidth) / 2;
        const y = chartHeight - barH;
        const isLast = i === data.length - 1;

        return (
          <Fragment key={i}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barH, 2)}
              rx={barWidth / 2}
              fill={isLast ? theme.accent.pink : theme.accent.purple}
              opacity={isLast ? 1 : 0.5}
            />
            <SvgText
              x={x + barWidth / 2}
              y={chartHeight + 16}
              fontSize={11}
              fill={theme.textSecondary}
              textAnchor="middle"
              fontWeight="600"
            >
              {item.month}
            </SvgText>
            {item.total > 0 && (
              <SvgText
                x={x + barWidth / 2}
                y={y - 6}
                fontSize={10}
                fill={theme.text}
                textAnchor="middle"
                fontWeight="700"
              >
                {item.total >= 1000
                  ? `${(item.total / 1000).toFixed(1)}k`
                  : item.total % 1 === 0
                    ? item.total.toFixed(0)
                    : item.total.toFixed(2)}
              </SvgText>
            )}
          </Fragment>
        );
      })}
    </Svg>
  );
};
