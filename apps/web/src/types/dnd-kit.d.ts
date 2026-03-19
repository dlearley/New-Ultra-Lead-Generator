declare module '@dnd-kit/core' {
  import * as React from 'react';
  
  export interface DragEndEvent {
    active: { id: string };
    over: { id: string } | null;
  }
  
  export interface SensorDescriptor {
    sensor: any;
    options?: any;
  }
  
  export const DndContext: React.FC<{
    sensors?: SensorDescriptor[];
    collisionDetection?: any;
    onDragEnd?: (event: DragEndEvent) => void;
    children?: React.ReactNode;
  }>;
  
  export const closestCenter: any;
  export const KeyboardSensor: any;
  export const PointerSensor: any;
  export const useSensor: (sensor: any, options?: any) => SensorDescriptor;
  export const useSensors: (...sensors: SensorDescriptor[]) => SensorDescriptor[];
}

declare module '@dnd-kit/sortable' {
  import * as React from 'react';
  
  export const arrayMove: (array: any[], from: number, to: number) => any[];
  export const SortableContext: React.FC<{
    items: string[];
    strategy?: any;
    children?: React.ReactNode;
  }>;
  export const sortableKeyboardCoordinates: any;
  export const verticalListSortingStrategy: any;
  export const useSortable: (options: { id: string }) => {
    attributes: any;
    listeners: any;
    setNodeRef: (node: HTMLElement | null) => void;
    transform: any;
    transition: any;
    isDragging: boolean;
  };
}

declare module '@dnd-kit/utilities' {
  export const CSS: {
    Transform: {
      toString: (transform: any) => string;
    };
  };
}
