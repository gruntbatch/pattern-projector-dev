namespace Interface {
    enum MenuMode {
        Calibration,
        Hidden,
        Pattern
    }
    
    enum MenuPosition {
        Left, Right
    }

    class Button {
        e: HTMLElement;

        constructor(id: string, onclick) {
            this.e = document.getElementById(id);
            this.e.onclick = onclick;
        }

        setInnerHTML(innerHTML: string) {
            this.e.innerHTML = innerHTML;
        }

        setActive(active: boolean) {
            if (active) {
                this.e.classList.add("active");
            } else {
                this.e.classList.remove("active");
            }
        }
    }

    class Tab {
        tab: Button;
        contents: Array<HTMLElement>;

        constructor(tab: Button, ...contents: Array<string>) {
            this.tab = tab;
            this.contents = contents.map((v) => document.getElementById(v));
            console.log(contents, this.contents);
        }

        setVisible(visible: boolean) {
            this.tab.setActive(visible);
            this.contents.map((v) => {
                v.classList.toggle("display-none", !visible);
            })
        }
    }
    
    export class Interface {
        menuMode: MenuMode;
        previousMenuMode: MenuMode;
        menuPosition: MenuPosition;

        menu: HTMLElement;
        calibrationButton: Button;
        hideButton: Button;
        swapButton: Button;
        patternButton: Button;

        calibrationTab: Tab;
        patternTab: Tab;

        zoomReset: HTMLElement;
        onZoomReset: () => void;
        zoomValue: HTMLElement;
        handles: Array<HTMLElement>;
        handleResets: Array<HTMLElement>;
        onHandleReset: (i: number) => void;
        handleXValues: Array<HTMLElement>;
        handleYValues: Array<HTMLElement>;

        constructor() {
            this.menuMode = MenuMode.Calibration;
            this.previousMenuMode = this.menuMode;
            this.menuPosition = MenuPosition.Left;

            this.menu = document.getElementById("menu");
            this.calibrationButton = new Button("calibration-button", () => {
                this.menuMode = MenuMode.Calibration;
                this.showMenu();
            });
            this.hideButton = new Button("hide-button", () => {
                if (this.menuMode == MenuMode.Hidden) {
                    this.menuMode = this.previousMenuMode;
                } else {
                    this.previousMenuMode = this.menuMode;
                    this.menuMode = MenuMode.Hidden;
                }
                this.showMenu();
            });
            this.swapButton = new Button("swap-button", () => {
                if (this.menuPosition == MenuPosition.Left) {
                    this.menuPosition = MenuPosition.Right;
                } else {
                    this.menuPosition = MenuPosition.Left;
                }
                this.positionMenu();
            })
            this.patternButton = new Button("pattern-button", () => {
                this.menuMode = MenuMode.Pattern;
                this.showMenu();
            });

            this.calibrationTab = new Tab(this.calibrationButton, "calibration-panel", "save-load-panel");
            this.patternTab = new Tab(this.patternButton, "pattern-panel", "save-load-panel");

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

            this.showMenu();
            this.positionMenu();
        }

        showMenu() {
            switch (this.menuMode) {
                case MenuMode.Calibration:
                    this.patternTab.setVisible(false);
                    this.calibrationTab.setVisible(true);
                    this.hideButton.setInnerHTML("Hide");
                    break;

                case MenuMode.Hidden:
                    this.patternTab.setVisible(false);
                    this.calibrationTab.setVisible(false);
                    this.hideButton.setInnerHTML("Show");
                    break;

                case MenuMode.Pattern:
                    this.calibrationTab.setVisible(false);
                    this.patternTab.setVisible(true);
                    this.hideButton.setInnerHTML("Hide");
                    break;
            }
        }

        positionMenu() {
            switch (this.menuPosition) {
                case MenuPosition.Left:
                    this.menu.classList.add("left");
                    this.menu.classList.remove("right");
                    break;
                
                case MenuPosition.Right:
                    this.menu.classList.remove("left");
                    this.menu.classList.add("right");
                    break;
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