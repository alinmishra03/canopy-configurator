import { useEffect, useRef } from 'react';
import { Group, Image as KImage, Layer, Line, Rect, Stage, Text as KText, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { DesignElement, ImageElement, PanelDefinition, TextElement } from '@shared/types';
import { configurationStore } from '@/store/configurationStore';
import { useAssets, usePanelColor, usePanelElements } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';
import { useLoadedImage } from '@/utils/imageCache';
import { imageElementSize } from '@/utils/panelRenderer';
import { measureTextBlock, TEXT_LINE_HEIGHT } from '@/utils/textMetrics';

interface Box {
  width: number;
  height: number;
}

const PADDING = 28;

function panelPoints(panel: PanelDefinition, w: number, h: number): number[] {
  return panel.shape === 'triangle' ? [0, h, w, h, w / 2, 0] : [0, 0, w, 0, w, h, 0, h];
}

interface ElementNodeProps<T extends DesignElement> {
  element: T;
  panelId: string;
  box: Box;
  draggable: boolean;
}

function commonHandlers(element: DesignElement, panelId: string, box: Box) {
  const update = (patch: Partial<DesignElement>, transient: boolean) =>
    configurationStore.getState().updateElement(panelId, element.id, patch, { transient });
  const select = () => useUiStore.getState().selectElement(panelId, element.id);
  const position = (node: Konva.Node) => ({ x: node.x() / box.width, y: node.y() / box.height });
  return {
    onMouseDown: select,
    onTap: select,
    onDragStart: select,
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => update(position(e.target), true),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => update(position(e.target), false),
    update,
  };
}

function TextNode({ element, panelId, box, draggable }: ElementNodeProps<TextElement>) {
  const fontsVersion = useUiStore((s) => s.fontsVersion);
  const fontPx = element.fontSize * box.height;
  const metrics = measureTextBlock(element.text, element.fontFamily, element.fontWeight, fontPx);
  const { update, ...handlers } = commonHandlers(element, panelId, box);

  const applyTransform = (node: Konva.Node, transient: boolean) => {
    const scale = node.scaleY();
    node.scale({ x: 1, y: 1 });
    update({ fontSize: element.fontSize * scale, rotation: node.rotation(), x: node.x() / box.width, y: node.y() / box.height }, transient);
  };

  return (
    <KText
      key={fontsVersion}
      id={element.id}
      name="design-element"
      text={element.text || ' '}
      x={element.x * box.width}
      y={element.y * box.height}
      rotation={element.rotation}
      fontSize={fontPx}
      fontFamily={`"${element.fontFamily}", sans-serif`}
      fontStyle={element.fontWeight === 700 ? 'bold' : 'normal'}
      fill={element.color}
      lineHeight={TEXT_LINE_HEIGHT}
      align="center"
      wrap="none"
      width={metrics.width}
      offsetX={metrics.width / 2}
      offsetY={metrics.height / 2}
      draggable={draggable}
      onDblClick={() => document.getElementById('element-text-input')?.focus()}
      onDblTap={() => document.getElementById('element-text-input')?.focus()}
      onTransform={(e) => applyTransform(e.target, true)}
      onTransformEnd={(e) => applyTransform(e.target, false)}
      {...handlers}
    />
  );
}

function ImageNode({ element, panelId, box, draggable }: ElementNodeProps<ImageElement>) {
  const assets = useAssets();
  const asset = assets[element.assetId];
  const image = useLoadedImage(asset?.dataUrl);
  const { w, h } = imageElementSize(element.width, asset, box.width);
  const { update, ...handlers } = commonHandlers(element, panelId, box);

  const applyTransform = (node: Konva.Node, transient: boolean) => {
    const scale = node.scaleX();
    node.scale({ x: 1, y: 1 });
    update({ width: element.width * scale, rotation: node.rotation(), x: node.x() / box.width, y: node.y() / box.height }, transient);
  };

  if (!image) {
    return (
      <Rect
        id={element.id}
        x={element.x * box.width}
        y={element.y * box.height}
        width={w}
        height={h}
        offsetX={w / 2}
        offsetY={h / 2}
        rotation={element.rotation}
        fill="rgba(255,255,255,0.4)"
        dash={[6, 4]}
        stroke="#7a766e"
      />
    );
  }

  return (
    <KImage
      id={element.id}
      name="design-element"
      image={image}
      x={element.x * box.width}
      y={element.y * box.height}
      width={w}
      height={h}
      offsetX={w / 2}
      offsetY={h / 2}
      rotation={element.rotation}
      draggable={draggable}
      onTransform={(e) => applyTransform(e.target, true)}
      onTransformEnd={(e) => applyTransform(e.target, false)}
      {...handlers}
    />
  );
}

interface DesignCanvasProps {
  panel: PanelDefinition;
  width: number;
  height: number;
}

/**
 * Interactive Konva editor for one panel. Element geometry is stored
 * normalized (0..1), so the stage can be any size and the 3D textures stay
 * in sync with every drag, resize and rotation.
 */
export function DesignCanvas({ panel, width, height }: DesignCanvasProps) {
  const elements = usePanelElements(panel.id);
  const color = usePanelColor(panel.id);
  const selectedElementId = useUiStore((s) => s.selectedElementId);
  const fontsVersion = useUiStore((s) => s.fontsVersion);
  const transformerRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const aspect = panel.widthIn / panel.heightIn;
  const availW = Math.max(40, width - PADDING * 2);
  const availH = Math.max(40, height - PADDING * 2);
  const panelW = Math.min(availW, availH * aspect);
  const panelH = panelW / aspect;
  const box: Box = { width: panelW, height: panelH };
  const origin = { x: (width - panelW) / 2, y: (height - panelH) / 2 };
  const points = panelPoints(panel, panelW, panelH);

  const selected = elements.find((el) => el.id === selectedElementId);

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    const node = selected ? stage.findOne(`#${selected.id}`) : undefined;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selected, elements, panelW, panelH, fontsVersion]);

  const clearSelection = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const target = e.target;
    if (target === target.getStage() || target.name() === 'panel-background') {
      useUiStore.getState().clearElementSelection();
    }
  };

  return (
    <Stage ref={stageRef} width={width} height={height} onMouseDown={clearSelection} onTouchStart={clearSelection}>
      <Layer>
        <Group x={origin.x} y={origin.y}>
          <Line points={points} closed fill={color} name="panel-background" shadowColor="rgba(27,26,24,0.18)" shadowBlur={18} shadowOffsetY={6} />
          <Group
            clipFunc={(ctx) => {
              ctx.beginPath();
              ctx.moveTo(points[0] ?? 0, points[1] ?? 0);
              for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i] ?? 0, points[i + 1] ?? 0);
              ctx.closePath();
            }}
          >
            {elements.map((el) =>
              el.type === 'text' ? (
                <TextNode key={el.id} element={el} panelId={panel.id} box={box} draggable />
              ) : (
                <ImageNode key={el.id} element={el} panelId={panel.id} box={box} draggable />
              ),
            )}
          </Group>
          <Line points={points} closed stroke="rgba(27,26,24,0.28)" strokeWidth={1} listening={false} />
          <Line
            points={[panelW / 2, 0, panelW / 2, panelH]}
            stroke="rgba(27,26,24,0.12)"
            dash={[4, 6]}
            strokeWidth={1}
            listening={false}
          />
          <Transformer
            ref={transformerRef}
            rotateEnabled
            keepRatio
            flipEnabled={false}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            anchorSize={10}
            anchorCornerRadius={5}
            anchorStroke="#2f5bea"
            borderStroke="#2f5bea"
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            boundBoxFunc={(oldBox, newBox) => (newBox.width < 12 || newBox.height < 8 ? oldBox : newBox)}
          />
        </Group>
      </Layer>
    </Stage>
  );
}
