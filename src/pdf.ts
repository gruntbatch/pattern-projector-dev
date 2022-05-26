namespace PDF {
    export function onLoadPattern(e: any, canvas: HTMLCanvasElement) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.readAsBinaryString(file);
        reader.onload = (e) => {
            const loadingTask = pdfjsLib.getDocument({data: e.target.result})
            loadingTask.promise.then((pdf) => {
                const pageNumber = 1;
                pdf.getPage(pageNumber).then((page) => {
                    const viewport = page.getViewport({scale: 1.0});
                    const context = canvas.getContext("2d");
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    const renderTask = page.render({
                        canvasContext: context,
                        viewport: viewport
                    });
                    renderTask.promise.then(() => {
                        console.log("Page rendered");
                    })
                })
            }, (e) => {
                console.error(e);
            });
        }

    }
}