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

    handles: [Point, Point, Point, Point];

    currentHandle: number = -1;
    initialMousePosition: [number, number];
    initialCornerPosition: [number, number];

    constructor(myModel: model.Model, canvas: HTMLElement) {
        this.model = myModel;

        // Panel controls
        for (let e of document.getElementsByClassName("drawer")) {
            (e.firstElementChild as HTMLElement).onclick = () => {
                e.classList.toggle("collapsed");
            }
        }

        const displayTabview = new Tabview(
            document.getElementById("ruler-tab"),
            document.getElementById("ruler-contents"),
            () => {
                this.model.displayMode = model.DisplayMode.Ruler
            }
        );
        displayTabview.push(
            document.getElementById("pattern-tab"),
            document.getElementById("pattern-contents"),
            () => {
                this.model.displayMode = model.DisplayMode.Pattern
            }
        );
        displayTabview.show(0);

        const calibrationTabview = new Tabview(
            document.getElementById("keystone-tab"),
            document.getElementById("keystone-contents")
        );
        calibrationTabview.push(
            document.getElementById("pan-tab"),
            document.getElementById("pan-contents")
        );
        calibrationTabview.show(0);

        // Scalar controls
        new Scalar(this.model.precision, document.getElementById("precision-field"));

        this.handles = [null, null, null, null];
        const editors = ["corner-ne-field", "corner-nw-field", "corner-sw-field", "corner-se-field"];
        const handles = ["corner-ne-handle", "corner-nw-handle", "corner-sw-handle", "corner-se-handle"];
        for (let i = 0; i < 4; i++) {
            this.handles[i] = new Point(
                this.model.corners[i],
                document.getElementById(editors[i]),
                document.getElementById(handles[i])
            );
            this.handles[i].view();
        }
        document.getElementById("reset-all-corners").onclick = () => {
            for (let i = 0; i < 4; i++) {
                this.model.corners[i].x.reset();
                this.model.corners[i].y.reset();
                this.handles[i].view();
            }
        }

        const originHandle = new Point(
            this.model.origin,
            document.getElementById("origin-field"),
            document.getElementById("origin-handle")
        );
        originHandle.view();

        new IntegerScalar(this.model.pixelsPerLine, document.getElementById("pixels-per-line-field"));
        new IntegerScalar(this.model.unitsPerQuad, document.getElementById("units-per-quad-field"));

        // Global event handlers
        canvas.onwheel = (e) => {
            const delta = 1.0 + (e.deltaY * this.model.precision.get()) * SCROLL_SCALAR;
    
            for (let i = 0; i < 4; i++) {
                this.model.corners[i].mul(delta, delta);
                this.handles[i].view();
            }
        }
        canvas.onmousedown = (e) => {
            this.selectNearestCorner(e.pageX, e.pageY);
            this.initialMousePosition = [e.pageX, e.pageY];
            this.initialCornerPosition = [
                this.model.corners[this.currentHandle].x.get(),
                this.model.corners[this.currentHandle].y.get()
            ];
        }
        window.onmousemove = (e) => {
            if (this.currentHandle < 0) {
                return;
            }

            const currentMousePosition = [e.pageX, e.pageY];
            const deltaMousePosition = [
                currentMousePosition[0] - this.initialMousePosition[0],
                currentMousePosition[1] - this.initialMousePosition[1]
            ];

            const deltaCornerPosition = [
                deltaMousePosition[0] * this.model.precision.get(),
                deltaMousePosition[1] * this.model.precision.get()
            ];

            const currentCornerPosition = [
                this.initialCornerPosition[0] + deltaCornerPosition[0],
                this.initialCornerPosition[1] - deltaCornerPosition[1]
            ];

            this.model.corners[this.currentHandle].x.set(currentCornerPosition[0]);
            this.model.corners[this.currentHandle].y.set(currentCornerPosition[1]);

            this.handles[this.currentHandle].view();
        }
        window.onmouseup = (e) => {
            this.currentHandle = -1;
        }
    }

    onResize(width: number, height: number) {
        for (const handle of this.handles) {
            handle.view();
        }
    }

    selectNearestCorner(pageX: number, pageY: number) {
        pageX = pageX - (window.innerWidth / 2);
        pageY = (window.innerHeight / 2) - pageY;
        let best = Infinity;
        this.currentHandle = -1;
        this.model.corners.map((corner, i) => {
            const x = pageX - corner.x.get();
            const y = pageY - corner.y.get();
            const distanceSquared = Math.sqrt(x * x + y * y);
            if (distanceSquared < best) {
                best = distanceSquared;
                this.currentHandle = i;
            }
        });
    }
}

class Point {
    value: model.Point;
    displayX: HTMLElement;
    displayY: HTMLElement;
    handle: HTMLElement | null;

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
    contents: Array<HTMLElement>;
    onSwitches: Array<(() => void) | null>;

    constructor(tab: HTMLElement, contents: HTMLElement, onSwitch: (() => void) | null = null) {
        this.activeTab = 0;
        this.tabs = new Array<HTMLElement>();
        this.contents = new Array<HTMLElement>();
        this.onSwitches = new Array<(() => void) | null>();
        this.push(tab, contents, onSwitch);
    }

    push(tab: HTMLElement, contents: HTMLElement, onSwitch: (() => void) | null = null) {
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
                this.contents[i].classList.remove("display-none");
                this.onSwitches[i]?.();
            } else {
                this.tabs[i].classList.remove("active");
                this.contents[i].classList.add("display-none");
            }
        }
    }
}
