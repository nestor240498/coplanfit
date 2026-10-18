import { Platform } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { fonts, fontSizes } from '@/theme/typography';

import type { ChartScene } from './scene';

/** Dibuja una escena con react-native-svg (también en web). */
export function ChartView({ scene }: { scene: ChartScene }) {
  return (
    <Svg
      width={scene.width}
      height={scene.height}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      // En web, react-native-svg vuelca `accessible` al DOM como atributo no booleano y lanza un error
      {...(Platform.OS === 'web' ? { role: 'img', 'aria-label': scene.desc } : { accessible: true, accessibilityLabel: scene.desc })}
    >
      {scene.nodes.map((node, i) => {
        switch (node.kind) {
          case 'rect':
            return (
              <Rect
                key={i}
                x={node.x}
                y={node.y}
                width={node.w}
                height={node.h}
                rx={node.rx}
                fill={node.fill}
                stroke={node.stroke}
                strokeWidth={node.strokeWidth}
                opacity={node.opacity}
              />
            );
          case 'path':
            return (
              <Path
                key={i}
                d={node.d}
                fill={node.fill ?? 'none'}
                stroke={node.stroke}
                strokeWidth={node.strokeWidth}
                strokeDasharray={node.dash}
                opacity={node.opacity}
              />
            );
          case 'line':
            return (
              <Line
                key={i}
                x1={node.x1}
                y1={node.y1}
                x2={node.x2}
                y2={node.y2}
                stroke={node.stroke}
                strokeWidth={node.strokeWidth}
                strokeDasharray={node.dash}
              />
            );
          case 'circle':
            return <Circle key={i} cx={node.cx} cy={node.cy} r={node.r} fill={node.fill} stroke={node.stroke} strokeWidth={node.strokeWidth} />;
          case 'text':
            return (
              <SvgText
                key={i}
                x={node.x}
                y={node.y}
                fill={node.fill}
                fontSize={fontSizes[node.role]}
                fontFamily={node.weight === 'bold' ? fonts.bodyBold : fonts.body}
                textAnchor={node.anchor ?? 'start'}
              >
                {node.text}
              </SvgText>
            );
        }
      })}
    </Svg>
  );
}
