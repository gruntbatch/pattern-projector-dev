namespace Interface {
    class Value {
        e: HTMLElement;
        truncate: number;

        constructor(id: string, initial: number, truncate: number = 2) {
            this.e = document.getElementById(id);
            this.truncate = truncate;
            this.setValue(initial);
        }

        setValue(value: number) {
            this.e.innerHTML = ((value < 0) ? "" : " ") + value.toFixed(this.truncate);
        }
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

    class Handle {
        handle: Model.Handle;
        reset: Button;
        handleElement: HTMLElement;
        x: Value;
        y: Value;

        constructor(handle: Model.Handle, id: string) {
            this.handle = handle;
            console.log(id);
            this.reset = new Button(id + "-reset", () => { this.handle.resetPosition(); });
            this.handleElement = document.getElementById(id + "-handle");
            this.x = new Value(id + "-x", 3);
            this.y = new Value(id + "-y", 3);
        }

        setValue(position: Point) {
            this.x.setValue(position.x);
            this.y.setValue(position.y);
            position = Context.glRenderer.canvasToWindowPoint(position);
            position = Point.add(new Point(-remToPixels(1), -remToPixels(1)), position);
            this.handleElement.style.left = position.x + "px";
            this.handleElement.style.top = position.y + "px";
        }

        update() {
            this.setValue(this.handle.position);
        }
    }

    class VisibilityGroup {
        contents: Array<HTMLElement>;

        constructor(...contents: Array<HTMLElement>) {
            this.contents = contents;
        }

        setVisible(visible: boolean) {
            this.contents.map((v) => {
                v.classList.toggle("display-none", !visible);
            })
        }
    }

    abstract class Editor {
        model: Model.Model;

        scaleReset: Button;
        scaleValue: Value;

        origin: Handle;
        allHandles: Handle[];
        
        visibilityGroup: VisibilityGroup;

        update() {
            this.scaleValue.setValue(this.model.scale);
            this.allHandles.map(x => x.update());
        }
    }

    export class Calibrator extends Editor {
        perspective: Handle[];

        constructor(calibration: Model.Calibration) {
            super();
            this.model = calibration;

            this.scaleReset = new Button("ruler-scale-reset", () => { this.model.onResetScale(); });
            this.scaleValue = new Value("ruler-scale-value", this.model.scale);

            this.origin = new Handle(calibration.origin, "ruler-origin");
            this.perspective = calibration.perspective.map((handle, i) => new Handle(handle, "ruler-perspective-" + i.toString()));
            this.allHandles = [
                this.origin,
                ...this.perspective
            ];

            this.visibilityGroup = new VisibilityGroup(
                ...["ruler-panel", "save-load-panel"].map(x => document.getElementById(x)),
                ...this.allHandles.map(x => x.handleElement)
            );
        }
    }

    export class Projector extends Editor {
        loadPatternButton: Button;

        constructor(projection: Model.Projection) {
            super();
            this.model = projection;

            this.scaleReset = new Button("pattern-scale-reset", () => { this.model.onResetScale(); });
            this.scaleValue = new Value("pattern-scale-value", this.model.scale);

            this.allHandles = [
                new Handle(projection.origin, "pattern-origin")
            ];

            const patternInput = document.getElementById("pattern-input");
            this.loadPatternButton = new Button("load-pattern-button", () => {
                patternInput.click();
            });

            this.visibilityGroup = new VisibilityGroup(
                ...["pattern-panel", "save-load-panel"].map(x => document.getElementById(x)),
                ...this.allHandles.map(x => x.handleElement)
            );
        }
    }

    export enum ActiveEditor {
        Calibrator,
        Hidden,
        Projector
    };
    
    export class Interface {
        menu: HTMLElement;

        alignLeft: boolean;
        swapSidesButton: Button;

        activeEditor: ActiveEditor;
        previousEditor: ActiveEditor;
        calibratorMenuButton: Button;
        hideMenuButton: Button;
        projectorMenuButton: Button;
        
        calibrator: Calibrator;
        projector: Projector;
        editor: Editor;
        
        sensitivity: number;

        currentHandle: number;
        initialHandlePosition: Point;
        initialMousePosition: Point;

        constructor(calibration: Model.Calibration, projection: Model.Projection){
            this.menu = document.getElementById("menu");

            this.alignLeft = true;
            this.menu.classList.toggle("left", this.alignLeft);
            this.swapSidesButton = new Button("swap-sides-button", () => {
                this.alignLeft = !this.alignLeft;
                this.menu.classList.toggle("left", this.alignLeft);
                this.menu.classList.toggle("right", !this.alignLeft);
            });

            this.activeEditor = ActiveEditor.Calibrator;
            this.previousEditor = this.activeEditor;
            this.calibratorMenuButton = new Button("ruler-menu-button", () => {
                this.setActiveEditor(ActiveEditor.Calibrator);
            });
            this.hideMenuButton = new Button("hide-menu-button", () => {
                if (this.activeEditor == ActiveEditor.Hidden) {
                    this.setActiveEditor(this.previousEditor);
                } else {
                    this.previousEditor = this.activeEditor;
                    this.setActiveEditor(ActiveEditor.Hidden);
                }
            });
            this.projectorMenuButton = new Button("pattern-menu-button", () => {
                this.setActiveEditor(ActiveEditor.Projector);
            })

            this.calibrator = new Calibrator(calibration);
            this.projector = new Projector(projection);
            this.editor = this.calibrator;

            this.sensitivity = 0.1;

            this.currentHandle = -1;

            this.initialHandlePosition = new Point(0, 0);
            this.initialMousePosition = new Point(0, 0);

            this.setActiveEditor(ActiveEditor.Calibrator);
            this.onResize();
        }

        getActiveEditor() {
            if (this.activeEditor == ActiveEditor.Hidden) {
                return this.previousEditor;
            } else {
                return this.activeEditor;
            }
        }

        setActiveEditor(activeEditor: ActiveEditor) {
            this.activeEditor = activeEditor;
            switch(this.activeEditor) {
                case ActiveEditor.Calibrator:
                    this.editor = this.calibrator;
                    this.projectorMenuButton.e.classList.remove("active");
                    this.projector.visibilityGroup.setVisible(false);
                    this.calibratorMenuButton.e.classList.add("active");
                    this.calibrator.visibilityGroup.setVisible(true);
                    this.hideMenuButton.setInnerHTML("Hide");
                    break;
                    
                case ActiveEditor.Hidden:
                    this.calibratorMenuButton.e.classList.remove("active");
                    this.calibrator.visibilityGroup.setVisible(false);
                    this.projectorMenuButton.e.classList.remove("active");
                    this.projector.visibilityGroup.setVisible(false);
                    this.hideMenuButton.setInnerHTML("Show");
                    break;

                case ActiveEditor.Projector:
                    this.editor = this.projector;
                    this.calibratorMenuButton.e.classList.remove("active");
                    this.calibrator.visibilityGroup.setVisible(false);
                    this.projectorMenuButton.e.classList.add("active");
                    this.projector.visibilityGroup.setVisible(true);
                    this.hideMenuButton.setInnerHTML("Hide");
                    break;
            }
        }

        onResize() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            Context.glCanvas.width = width;
            Context.glCanvas.height = height;
            Context.glRenderer.resizeCanvas(width, height);
        }

        onMouseDown(e: MouseEvent) {
            this.initialMousePosition = Context.glRenderer.windowToCanvasPoint(new Point(e.pageX, e.pageY));
            let radius = Context.glRenderer.windowToCanvasScalar(remToPixels(1));
            let best = radius * radius;
            this.currentHandle = -1;
            this.editor.allHandles.map((handle, i) => {
                let x = this.initialMousePosition.x - handle.handle.position.x;
                let y = this.initialMousePosition.y - handle.handle.position.y;
                let distanceSquared = x * x + y * y;
                if (best > distanceSquared) {
                    best = distanceSquared;
                    this.currentHandle = i;
                    this.initialHandlePosition = handle.handle.position;
                }
            })
        }

        onMouseMove(e: MouseEvent) {
            if (this.currentHandle < 0) {
                return;
            }

            const mousePosition = Context.glRenderer.windowToCanvasPoint(new Point(e.pageX, e.pageY));
            let canvasPosition = Point.add(
                this.initialHandlePosition,
                Point.scale(
                    Point.sub(
                        mousePosition,
                        this.initialMousePosition
                    ),
                    this.sensitivity
                )
            );
            
            this.editor.allHandles[this.currentHandle].handle.position = canvasPosition;
            // this.editor.allHandles[this.currentHandle].setPosition(canvasPosition);
        }

        onMouseUp() {
            this.currentHandle = -1;
        }

        onWheel(e: WheelEvent) {
            this.editor.model.onChangeScale(e.deltaY * 0.0005);
        }

        onUpdate() {
            this.calibrator.update();
            this.projector.update();
        }
    }
}