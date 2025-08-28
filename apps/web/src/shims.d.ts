// apps/web/src/shims.d.ts

// Vite & 에셋 임포트 보조 선언

declare module '*.css' {
  const css: string
  export default css
}

declare module '*.svg' {
  const src: string
  export default src
}
// 외부 라이브러리 타입 보완
declare module 'file-saver' {
  export function saveAs(data: Blob | File | string, filename?: string, options?: any): void;
}

declare module 'docx' {
  export const Document: any
  export const Packer: any
  export const Paragraph: any
  export const HeadingLevel: any
  export const TextRun: any
  export const AlignmentType: any
}

declare module 'jszip' {
  interface JSZipFileOptions {
    base64?: boolean;
    binary?: boolean;
    dir?: boolean;
    date?: Date;
    comment?: string;
  }

  class JSZipObject {
    name: string;
    dir: boolean;
    async(type: string): Promise<any>;
  }

  class JSZip {
    file(path: string, data: string | Blob | ArrayBuffer, options?: JSZipFileOptions): this;
    generateAsync(options: { type: 'blob' | 'base64' | 'uint8array' | 'arraybuffer' }): Promise<Blob>;
  }

  export = JSZip;
}

declare module 'jspdf' {
  export class jsPDF {
    constructor(options?: { unit?: string; format?: string | number[]; orientation?: 'p' | 'portrait' | 'l' | 'landscape' });
    text(text: string, x: number, y: number): void;
    setFont(font?: string, style?: string): void;
    addImage(imageData: string | HTMLImageElement, format: string, x: number, y: number, width: number, height: number, alias?: string, compression?: string): void;
    save(filename: string): void;
  }
}

// React 컴포넌트에서 PNG Data URL 등을 참조할 때 필요
declare module '*.png' {
  const value: string;
  export default value;
}
declare module '*.jpg' {
  const value: string;
  export default value;
}
declare module '*.jpeg' {
  const value: string;
  export default value;
}
declare module '*.svg' {
  const value: string;
  export default value;
}
declare module 'mermaid' {
  // 최소한의 사용만 선언 (초기 안정용)
  const mermaid: any
  export default mermaid
}
