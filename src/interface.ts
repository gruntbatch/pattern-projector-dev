enum MenuMode {
    Calibration,
    Hidden,
    Pattern
}

class Interface {
    menu: HTMLElement;
    menuMode: MenuMode;
    previousMenuMode: MenuMode;
    menuHide: HTMLElement;
    menuLeft: boolean;
    menuSwap: HTMLElement;

    calibrationPanel: HTMLElement;
    zoomReset: HTMLElement;
    onZoomReset: () => void;
    zoomValue: HTMLElement;
    handles: Array<HTMLElement>;
    handleResets: Array<HTMLElement>;
    onHandleReset: (i: number) => void;
    handleXValues: Array<HTMLElement>;
    handleYValues: Array<HTMLElement>;

    patternPanel: HTMLElement;

    saveLoadPanel: HTMLElement;

    constructor () {
        this.menu = document.getElementById("menu");
        this.menuMode = MenuMode.Calibration;
        this.previousMenuMode = this.menuMode;
        this.menuHide = document.getElementById("hide");
        this.menuHide.onclick = () => {
            if (this.menuMode == MenuMode.Hidden) {
                this.menuHide.innerHTML = "Hide";
                this.menuMode = this.previousMenuMode;
                this.updateMenuMode();
            } else {
                this.menuHide.innerHTML = "Show";
                this.previousMenuMode = this.menuMode;
                this.menuMode = MenuMode.Hidden
                this.updateMenuMode();
            }
        }
        this.menuLeft = true;
        this.menuSwap = document.getElementById("swap");
        this.menuSwap.onclick = () => {
            this.menuLeft = !this.menuLeft;
            this.swapMenu();
        };

        this.calibrationPanel = document.getElementById("calibration-panel");
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

        this.patternPanel = document.getElementById("pattern-panel");

        this.saveLoadPanel = document.getElementById("save-load-panel");

        this.swapMenu();
        this.updateMenuMode();
    }

    updateMenuMode() {
        switch(this.menuMode) {
            case MenuMode.Calibration:
                this.calibrationPanel.classList.remove("display-none");
                this.patternPanel.classList.add("display-none");
                this.saveLoadPanel.classList.remove("display-none");
                break;

            case MenuMode.Hidden:
                this.calibrationPanel.classList.add("display-none");
                this.patternPanel.classList.add("display-none");
                this.saveLoadPanel.classList.add("display-none");
                break;

            case MenuMode.Pattern:
                this.calibrationPanel.classList.add("display-none");
                this.patternPanel.classList.remove("display-none");
                this.saveLoadPanel.classList.remove("display-none");
                break;
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
