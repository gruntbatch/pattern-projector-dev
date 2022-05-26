class Interface {
    menu: HTMLElement;
    menuLeft: boolean;
    menuSwap: HTMLElement;
    zoomReset: HTMLElement;
    onZoomReset: () => void;
    zoomValue: HTMLElement;
    handles: Array<HTMLElement>;
    handleResets: Array<HTMLElement>;
    onHandleReset: (i: number) => void;
    handleXValues: Array<HTMLElement>;
    handleYValues: Array<HTMLElement>;

    constructor () {
        this.menu = document.getElementById("menu");
        this.menuLeft = true;
        this.swapMenu();
        this.menuSwap = document.getElementById("swap");
        this.menuSwap.onclick = () => {
            this.menuLeft = !this.menuLeft;
            this.swapMenu();
        };
        this.zoomReset = document.getElementById("zoom-reset");
        this.zoomReset.onclick = () => {
            this.onZoomReset();
        }
        this.zoomValue = document.getElementById("zoom-value");
        this.handles = new Array<HTMLElement>(5);
        this.handleResets = new Array<HTMLElement>(5);
        this.handleXValues = new Array<HTMLElement>(5);
        this.handleYValues = new Array<HTMLElement>(5);
        for (let i=0; i<5; i++) {
            this.handles[i] = document.getElementById("handle-" + i);
            this.handleResets[i] = document.getElementById("reset-" + i);
            this.handleResets[i].onclick = () => {
                this.onHandleReset(i);
            }
            this.handleXValues[i] = document.getElementById("x-" + i);
            this.handleYValues[i] = document.getElementById("y-" + i);
        }
    }

    swapMenu() {
        if (this.menuLeft) {
            this.menu.classList.add("left");
            this.menu.classList.remove("right");
        } else {
            this.menu.classList.remove("left");
            this.menu.classList.add("right");
        }
    }

    updateValues(zoomValue: number, handleValues: Array<Point>, handlePositions: Array<Point>) {
        this.zoomValue.innerHTML = ((zoomValue < 0) ? "" : " ") + zoomValue.toFixed(2);
        const handleOffset = new Point(-remToPixels(1), -remToPixels(1));
        for (let i=0; i<5; i++) {
            const x = handleValues[i].x;
            this.handleXValues[i].innerHTML = ((x < 0) ? "": " ") + x.toFixed(3);
            const y = handleValues[i].y;
            this.handleYValues[i].innerHTML = ((y < 0) ? "": " ") + y.toFixed(3);

            let handlePosition = Point.add(handlePositions[i], handleOffset);
            this.handles[i].style.left = handlePosition.x + "px";
            this.handles[i].style.top = handlePosition.y + "px";
        }
    }
}
