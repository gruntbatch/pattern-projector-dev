declare namespace pdfjsLib {
    export function getDocument(src: string | URL | ArrayBuffer): PDFDocumentLoadingTask;
    export class PDFDocumentLoadingTask {
        get promise(): Promise<PDFDocumentProxy>;
    }
    export class RenderTask {
        get promise(): Promise<void>;
    }
    export class PDFDocumentProxy {
        getPage(pageNumber: number): Promise<PDFPageProxy>;
    }
    export class PDFPageProxy {
        getViewport({ scale: number }): PageViewport;
        render({ canvasContext: CanvasRenderingContext2D, viewport: PageViewport }): RenderTask;
    }
    export class PageViewport {
        width: number;
        height: number;
    }
}
