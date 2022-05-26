namespace Interface {
    enum MenuMode {
        Calibration,
        Hidden,
        Pattern
    }
    
    export class Interface {
        menu: HTMLElement;
        menuMode: MenuMode;
        previousMenuMode: MenuMode;
        calibrationButton: HTMLElement;
        menuHide: HTMLElement;
        menuLeft: boolean;
        menuSwap: HTMLElement;
        patternButton: HTMLElement;

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

        constructor() {
            this.menu = document.getElementById("menu");
            this.menuMode = MenuMode.Calibration;
            this.previousMenuMode = this.menuMode;
            this.calibrationButton = document.getElementById("calibration-button");
            this.calibrationButton.onclick = () => {
                this.menuMode = MenuMode.Calibration;
                this.updateMenuMode();
            }
            this.menuHide = document.getElementById("hide");
            this.menuHide.onclick = () => {
                if (this.menuMode == MenuMode.Hidden) {
                    this.menuMode = this.previousMenuMode;
                } else {
                    this.previousMenuMode = this.menuMode;
                    this.menuMode = MenuMode.Hidden
                }
                this.updateMenuMode();
            }
            this.menuLeft = true;
            this.menuSwap = document.getElementById("swap");
            this.menuSwap.onclick = () => {
                this.menuLeft = !this.menuLeft;
                this.swapMenu();
            };
            this.patternButton = document.getElementById("pattern-button");
            this.patternButton.onclick = () => {
                this.menuMode = MenuMode.Pattern;
                this.updateMenuMode();
            }

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
            for (let i = 0; i < 5; i++) {
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
            switch (this.menuMode) {
                case MenuMode.Calibration:
                    this.calibrationButton.classList.add("bg-blue");
                    this.calibrationButton.classList.remove("bg-gray");
                    this.calibrationPanel.classList.remove("display-none");

                    this.patternButton.classList.remove("bg-blue");
                    this.patternButton.classList.add("bg-gray");
                    this.patternPanel.classList.add("display-none");

                    this.saveLoadPanel.classList.remove("display-none");

                    this.menuHide.innerHTML = "Hide";
                    break;

                case MenuMode.Hidden:
                    this.calibrationButton.classList.remove("bg-blue");
                    this.calibrationButton.classList.add("bg-gray");
                    this.calibrationPanel.classList.add("display-none");

                    this.patternButton.classList.remove("bg-blue");
                    this.patternButton.classList.add("bg-gray");
                    this.patternPanel.classList.add("display-none");

                    this.saveLoadPanel.classList.add("display-none");

                    this.menuHide.innerHTML = "Show";
                    break;

                case MenuMode.Pattern:
                    this.calibrationButton.classList.remove("bg-blue");
                    this.calibrationButton.classList.add("bg-gray");
                    this.calibrationPanel.classList.add("display-none");

                    this.patternButton.classList.add("bg-blue");
                    this.patternButton.classList.remove("bg-gray");
                    this.patternPanel.classList.remove("display-none");

                    this.saveLoadPanel.classList.remove("display-none");

                    this.menuHide.innerHTML = "Hide";
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
            for (let i = 0; i < 5; i++) {
                const x = handleValues[i].x;
                this.handleXValues[i].innerHTML = ((x < 0) ? "" : " ") + x.toFixed(3);
                const y = handleValues[i].y;
                this.handleYValues[i].innerHTML = ((y < 0) ? "" : " ") + y.toFixed(3);

                let handlePosition = Point.add(handlePositions[i], handleOffset);
                this.handles[i].style.left = handlePosition.x + "px";
                this.handles[i].style.top = handlePosition.y + "px";
            }
        }
    }
}