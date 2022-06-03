namespace PDF {
    export class Renderer {
        context: CanvasRenderingContext2D;
        texture: WebGLTexture;

        constructor() {
            Context.pdfCanvas.width = 1;
            Context.pdfCanvas.height = 1;
            this.context = Context.pdfCanvas.getContext("2d");

            {
                const gl = Context.gl;
                this.texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, this.texture);
                gl.texImage2D(
                    gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 0, 255])
                );
            }
        }

        async renderPattern(e: any) {
            const file = e.target.files[0];
            const data = await readFileAsync(file);
            const pdf = await pdfjsLib.getDocument({data: data}).promise;
            const pageNumber = 1;
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({scale: 1.0});
            
            Context.pdfCanvas.width = viewport.width;
            Context.pdfCanvas.height = viewport.height;
            
            await page.render({
                canvasContext: this.context,
                viewport: viewport
            }).promise;

            {
                const gl = Context.gl;
                gl.bindTexture(gl.TEXTURE_2D, this.texture);
                gl.texImage2D(
                    gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, Context.pdfCanvas
                );
                gl.generateMipmap(gl.TEXTURE_2D);
            }
        }
    }
}