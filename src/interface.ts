namespace Interface {
    export enum MenuMode {
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
        }

        setVisible(visible: boolean) {
            this.tab.setActive(visible);
            this.contents.map((v) => {
                v.classList.toggle("display-none", !visible);
            })
        }
    }

    class Handle {
        reset: Button;
        handle: HTMLElement;
        x: HTMLElement;
        y: HTMLElement;

        constructor(index: number, onclick) {
            this.reset = new Button("reset-" + index, onclick);
            this.handle = document.getElementById("handle-" + index);
            this.x = document.getElementById("x-" + index);
            this.y = document.getElementById("y-" + index);
        }

        updateValues(value: Point, position: Point) {
            this.x.innerHTML = ((value.x < 0) ? "" : " ") + value.x.toFixed(3);
            this.y.innerHTML = ((value.y < 0) ? "" : " ") + value.y.toFixed(3);
            position = Point.add(new Point(-remToPixels(1), -remToPixels(1)), position);
            this.handle.style.left = position.x + "px";
            this.handle.style.top = position.y + "px";
        }
    }
    
    export class Interface {
        menuMode: MenuMode;
        onChangeMode: (mode: MenuMode) => void;
        previousMenuMode: MenuMode;
        menuPosition: MenuPosition;

        menu: HTMLElement;
        calibrationButton: Button;
        hideButton: Button;
        swapButton: Button;
        patternButton: Button;

        calibrationTab: Tab;
        
        zoomReset: HTMLElement;
        onZoomReset: () => void;
        zoomValue: HTMLElement;
        onHandleReset: (i: number) => void;
        handles: Array<Handle>;

        patternTab: Tab;
        loadPatternButton: Button;
        onLoadPattern: (e: any) => void;

        constructor() {
            this.menuMode = MenuMode.Pattern;
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
            
            this.zoomReset = document.getElementById("zoom-reset");
            this.zoomReset.onclick = () => {
                this.onZoomReset();
            }
            this.zoomValue = document.getElementById("zoom-value");
            
            this.handles = new Array<Handle>(5);
            for (let i = 0; i < 5; i++) {
                this.handles[i] = new Handle(i, () => {
                    this.onHandleReset(i);
                });
            }

            this.patternTab = new Tab(this.patternButton, "pattern-panel", "save-load-panel");
            const patternInput = document.getElementById("pattern-input");
            patternInput.onchange = (e: any) => {
                this.onLoadPattern(e);
            }
            this.loadPatternButton = new Button("load-pattern-button", () => {
                patternInput.click();
            });


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

            for (let i = 0; i < 5; i++) {
                this.handles[i].updateValues(handleValues[i], handlePositions[i]);
            }
        }
    }
}