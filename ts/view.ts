import * as math from "./math.js";
import * as model from "./model.js";

export {
    Editor,
    Scalar,
};

const CORNER_MOVEMENT = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1]
];
const SCROLL_SCALAR = 0.001;
const REM_TO_PIXELS = parseFloat(getComputedStyle(document.documentElement).fontSize);

class Editor {
    model: model.Model;

    keystoneHandles: [Handle, Handle, Handle, Handle];
    panHandle: ScrubHandle;
    activeHandle: Handle;


    constructor(myModel: model.Model, canvas: HTMLElement) {
        this.model = myModel;

        // Panel controls
        for (let e of document.getElementsByClassName("drawer")) {
            (e.firstElementChild as HTMLElement).onclick = () => {
                e.classList.toggle("collapsed");
            }
        }

        // Precision
        new Scalar(this.model.precision, document.getElementById("precision-field"));

        // Display panel
        const displayTabview = new Tabview(
            document.getElementById("ruler-tab"),
            [
                document.getElementById("ruler-contents"),
            ],
            () => {
                this.model.displayMode = model.DisplayMode.Ruler
            }
        );
        displayTabview.push(
            document.getElementById("pattern-tab"),
            [
                document.getElementById("pattern-contents"),
            ],
            () => {
                this.model.displayMode = model.DisplayMode.Pattern
            }
        );
        displayTabview.show(this.model.displayMode);

        // Ruler
        new IntegerScalar(this.model.pixelsPerLine, document.getElementById("pixels-per-line-field"));
        new IntegerScalar(this.model.unitsPerQuad, document.getElementById("units-per-quad-field"));

        // Pattern

        // Calibration panel
        const calibrationTabview = new Tabview(
            document.getElementById("keystone-tab"),
            [
                document.getElementById("keystone-handles"),
                document.getElementById("keystone-contents"),
            ],
            () => {
                this.model.calibrationMode = model.CalibrationMode.Keystone;
            }
        );
        calibrationTabview.push(
            document.getElementById("pan-tab"),
            [
                document.getElementById("pan-handles"),
                document.getElementById("pan-contents"),
            ],
            () => {
                this.model.calibrationMode = model.CalibrationMode.PanZoom;
            }
        );
        calibrationTabview.show(this.model.calibrationMode);

        // Keystone
        this.keystoneHandles = [null, null, null, null];
        const editors = ["corner-ne-field", "corner-nw-field", "corner-sw-field", "corner-se-field"];
        const handles = ["corner-ne-handle", "corner-nw-handle", "corner-sw-handle", "corner-se-handle"];
        for (let i = 0; i < 4; i++) {
            this.keystoneHandles[i] = new Handle(
                this.model.corners[i],
                document.getElementById(editors[i]),
                document.getElementById(handles[i])
            );
            this.keystoneHandles[i].view();
        }
        this.activeHandle = null;
        document.getElementById("reset-all-corners").onclick = () => {
            for (let i = 0; i < 4; i++) {
                this.model.corners[i].reset();
                this.keystoneHandles[i].view();
            }
        }

        // Pan & Zoom
        this.panHandle = new ScrubHandle(
            this.model.pan,
            document.getElementById("pan-field"),
            document.getElementById("pan-handle")
        );
        this.panHandle.view();

        new Scalar(this.model.zoom, document.getElementById("zoom-field"));

        // Global event handlers
        canvas.onwheel = (e: WheelEvent) => {
            this.onWheel(e);
        }
        canvas.onmousedown = (e) => {
            switch (this.model.calibrationMode) {
                case model.CalibrationMode.Keystone:
                    this.activeHandle = this.selectNearestHandle(
                        new math.Vector2([
                            e.pageX - (window.innerWidth / 2.0),
                            (window.innerHeight / 2.0) - e.pageY
                        ]),
                        this.keystoneHandles
                    );
                    break;

                case model.CalibrationMode.PanZoom:
                    this.activeHandle = this.panHandle;
                    break;
            }
            this.activeHandle.onMouseDown(new math.Vector2([e.pageX, e.pageY]));
        }
        window.onmousemove = (e) => {
            if (!this.activeHandle) {
                return;
            }

            this.activeHandle.onMouseMove(new math.Vector2([e.pageX, e.pageY]));
        }
        window.onmouseup = (e) => {
            if (!this.activeHandle) {
                return;
            }

            this.activeHandle.onMouseUp(new math.Vector2([e.pageX, e.pageY]));
            this.activeHandle = null;
        }
    }

    onResize(width: number, height: number) {
        for (const handle of this.keystoneHandles) {
            handle.view();
        }
        this.panHandle.view();
    }

    onWheel(e: WheelEvent) {
        switch (this.model.calibrationMode) {
            case model.CalibrationMode.PanZoom:
                {
                    const deltaZoom = (e.deltaY * this.model.precision.get()) * SCROLL_SCALAR;
                    this.model.zoom.add(deltaZoom);
                }
                break;

            case model.CalibrationMode.Keystone:
                {
                    const delta = 1.0 + (e.deltaY * this.model.precision.get()) * SCROLL_SCALAR;
            
                    for (let i = 0; i < 4; i++) {
                        this.model.corners[i].mul(delta, delta);
                        this.keystoneHandles[i].view();
                    }
                }
                break;
        }
    }

    selectNearestHandle(mouse: math.Vector2, handles: Array<Handle>): Handle {
        let shortestDistance = Infinity;
        let nearestHandle = handles[0];
        for (const handle of handles) {
            const point = handle.value.getVector2();
            const distance = mouse.distanceTo(point);
            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearestHandle = handle;
            }
        }
        return nearestHandle;
    }
}

class Handle {
    value: model.Point;
    displayX: HTMLElement;
    displayY: HTMLElement;
    handle: HTMLElement | null;

    initialMousePosition: math.Vector2;
    deltaMousePosition: math.Vector2;

    initialModelPosition: math.Vector2;

    constructor(value: model.Point, e: HTMLElement, handle: HTMLElement | null = null) {
        this.value = value;

        this.displayX = e.querySelector<HTMLElement>("#display-x");
        this.displayY = e.querySelector<HTMLElement>("#display-y");
        this.view();

        e.querySelector<HTMLElement>("#field-x").onwheel = (e) => {
            this.value.x.add(e.deltaY);
            this.view();
        }

        e.querySelector<HTMLElement>("#field-y").onwheel = (e) => {
            this.value.y.add(e.deltaY);
            this.view();
        }

        e.querySelector<HTMLElement>("#reset").onclick = () => {
            this.value.reset();
            this.view();
        }

        this.handle = handle;

        this.initialMousePosition = new math.Vector2();
        this.deltaMousePosition = new math.Vector2();
        this.initialModelPosition = new math.Vector2();
    }

    onMouseDown(position: math.Vector2) {
        this.initialMousePosition = position;
        this.initialModelPosition = this.value.getVector2();
    }

    onMouseMove(position: math.Vector2) {
        this.deltaMousePosition = position.sub(this.initialMousePosition)
        const delta = this.deltaMousePosition.scale(this.value.x.scalar.get());
        const current = new math.Vector2([
            this.initialModelPosition.buffer[0] + delta.buffer[0],
            this.initialModelPosition.buffer[1] - delta.buffer[1]
        ]);
        this.value.x.set(current.buffer[0]);
        this.value.y.set(current.buffer[1]);
        this.view();
    }

    onMouseUp(position: math.Vector2) {

    }

    view() {
        let x = this.value.x.get();
        let y = this.value.y.get();
        this.displayX.innerText = x.toFixed(3);
        this.displayY.innerText = y.toFixed(3);
        if (this.handle) {
            this.handle.style.left = x + (window.innerWidth / 2) - REM_TO_PIXELS + "px";
            this.handle.style.top = (window.innerHeight / 2) - y - REM_TO_PIXELS + "px"
        }
    }
}

class ScrubHandle extends Handle {
    baseHandlePosition: math.Vector2;

    constructor(value: model.Point, e: HTMLElement, handle: HTMLElement | null = null) {
        super(value, e, handle);
        this.baseHandlePosition = value.getVector2();
    }

    onMouseUp(position: math.Vector2) {
        this.deltaMousePosition.buffer[0] = 0;
        this.deltaMousePosition.buffer[1] = 0;
        this.view();
    }

    view() {
        let x = this.value.x.get();
        let y = this.value.y.get();
        this.displayX.innerText = x.toFixed(3);
        this.displayY.innerText = y.toFixed(3);

        if (this.handle) {
            x = this.baseHandlePosition.buffer[0] + this.deltaMousePosition.buffer[0];
            y = this.baseHandlePosition.buffer[1] - this.deltaMousePosition.buffer[1];
            this.handle.style.left = x + (window.innerWidth / 2) - REM_TO_PIXELS + "px";
            this.handle.style.top = (window.innerHeight / 2) - y - REM_TO_PIXELS + "px"
        }
    }
}

class Scalar {
    value: model.Scalar;
    display: HTMLElement;

    constructor(value: model.Scalar, e: HTMLElement) {
        this.value = value;

        this.display = e.querySelector<HTMLElement>("#display");
        this.view();

        e.onwheel = (e) => {
            this.value.add(e.deltaY);
            this.view();
        };

        e.querySelector<HTMLElement>("#reset").onclick = () => {
            this.value.reset();
            this.view();
        };

        let decr = e.querySelector<HTMLElement>("#decrement");
        if (decr) {
            decr.onclick = () => {
                this.value.bypassAdd(-1);
                this.view();
            }
        }

        let incr = e.querySelector<HTMLElement>("#increment");
        if (incr) {
            incr.onclick = () => {
                this.value.bypassAdd(1);
                this.view();
            }
        }
    }

    view() {
        this.display.innerText = this.value.get().toFixed(3);
    }
}

class IntegerScalar extends Scalar {
    view() {
        this.display.innerText = this.value.get().toFixed(0);
    }
}

class Tabview {
    activeTab: number;
    e: HTMLElement;
    tabs: Array<HTMLElement>;
    contents: Array<Array<HTMLElement>>;
    onSwitches: Array<(() => void) | null>;

    constructor(tab: HTMLElement, contents: Array<HTMLElement>, onSwitch: (() => void) | null = null) {
        this.activeTab = 0;
        this.tabs = new Array<HTMLElement>();
        this.contents = new Array<Array<HTMLElement>>();
        this.onSwitches = new Array<(() => void) | null>();
        this.push(tab, contents, onSwitch);
    }

    push(tab: HTMLElement, contents: Array<HTMLElement>, onSwitch: (() => void) | null = null) {
        const index = this.tabs.length;

        this.tabs.push(tab);
        this.contents.push(contents);
        this.onSwitches.push(onSwitch);

        tab.onclick = (event: MouseEvent) => {
            if (this.activeTab != index) {
                this.activeTab = index;
                this.show(index);
                event.stopPropagation();
            }
        }
    }

    show(index: number) {
        for (let i = 0; i < this.tabs.length; i++) {
            if (i == index) {
                this.tabs[i].classList.add("active");
                for (const content of this.contents[i]) {
                    content.classList.remove("display-none");
                }
                this.onSwitches[i]?.();
            } else {
                this.tabs[i].classList.remove("active");
                for (const content of this.contents[i]) {
                    content.classList.add("display-none");
                }
            }
        }
    }
}
