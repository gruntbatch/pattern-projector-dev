namespace PDF {
    function readFileAsync(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result);
            }
            reader.onerror = reject;
            reader.readAsBinaryString(file);
        })
    }

    export class Renderer {
        canvas: HTMLCanvasElement;
        context: CanvasRenderingContext2D;
        gl: WebGL2RenderingContext;
        texture: WebGLTexture;

        constructor(gl: WebGL2RenderingContext) {
            this.gl = gl;
            this.canvas = document.getElementById("pdf-canvas")! as HTMLCanvasElement;
            this.context = this.canvas.getContext("2d");

            {
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
            this.canvas.width = viewport.width;
            this.canvas.height = viewport.height;
            await page.render({
                canvasContext: this.context,
                viewport: viewport
            }).promise;
            const gl = this.gl;
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.canvas
            );
            gl.generateMipmap(gl.TEXTURE_2D);
        }
    }
}