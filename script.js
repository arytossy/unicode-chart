const dynamicStyle = document.createElement("style");
document.head.appendChild(dynamicStyle);
const dynamicStyleSheet = dynamicStyle.sheet;

/**
 *
 * @param {string} selector
 * @returns {CSSStyleRule}
 */
function getStyleRule(selector) {

    const target = [...dynamicStyleSheet.cssRules]
        .find(rule => rule instanceof CSSStyleRule && rule.selectorText === selector);

    if (target) {
        return target;
    } else {
        const created = dynamicStyleSheet.insertRule(`${selector} {}`);
        return dynamicStyleSheet.cssRules[created];
    }
}

const chart = {

    // Container DOMs
    DOMS: {
        horizontalHeader: document.getElementById("horizontal-header"),
        verticalHeader: document.getElementById("vertical-header"),
        chartBody: document.getElementById("chart-body"),
    },

    // Style objects
    STYLES: {
        horizontalHeaderSection: getStyleRule("#horizontal-header .section").style,
        verticalHeaderSection: getStyleRule("#vertical-header .section").style,
        chartBodySection: getStyleRule("#chart-body .section").style,
        horizontalHeaderCell: getStyleRule("#horizontal-header .cell").style,
        verticalHeaderCell: getStyleRule("#vertical-header .cell").style,
        chartBodyCell: getStyleRule("#chart-body .cell").style,
        chartBodyGlyph: getStyleRule("#chart-body .cell .glyph").style,
        chartBodyCodePoint: getStyleRule("#chart-body .cell .code-point").style,
    },

    // Consts
    SECTION_COLUMNS: 40,
    SECTION_ROWS: 20,
    VERTICAL_LIMIT: parseInt("10ff", 16),
    HORIZONTAL_LIMIT: parseInt("ff", 16),
    CELL_SIZE_MIN: 50,

    // Variables
    currentRow: 0,
    currentColumn: 0,
    cellSize: 50,
    sections: {
        /** @type { Array<{ vidx: number, dom: HTMLDivElement }> } */
        verticalHeader: [],
        /** @type { Array<{ hidx: number, dom: HTMLDivElement }> } */
        horizontalHeader: [],
        /** @type { Array<{ vidx: number, hidx: number, dom: HTMLDivElement }> } */
        body: [],
    },

    getCurrentSectionIndex() {
        return {
            verticalIndex: Math.floor(this.currentRow / this.SECTION_ROWS),
            horizontalIndex: Math.floor(this.currentColumn / this.SECTION_COLUMNS),
        };
    },

    scrollVertically(delta) {

        let row = this.currentRow + (delta / 100);

        if (row < 0) {
            row = 0;
        } else if (this.currentRow > this.VERTICAL_LIMIT) {
            row = this.VERTICAL_LIMIT;
        }

        if (row === this.currentRow) return;

        this.currentRow = row;

        this.updateContents();
    },

    scrollHorizontally(delta) {

        let column = this.currentColumn + (delta / 100);

        if (column < 0) {
            column = 0;
        } else if (column > this.HORIZONTAL_LIMIT) {
            column = this.HORIZONTAL_LIMIT;
        }

        if (column === this.currentColumn) return;

        this.currentColumn = column;

        this.updateContents();
    },

    resizeCell(delta) {

        let cellSize = this.cellSize + (-1 * delta / 10);

        if (cellSize < this.CELL_SIZE_MIN) {
            cellSize = this.CELL_SIZE_MIN;
        }

        if (cellSize === this.cellSize) return;

        this.cellSize = cellSize;

        this.updateContents()
    },

    updateContents() {

        const current = this.getCurrentSectionIndex();

        // Section indexes to be drawn.
        const tobe = {
            vertical:
                [-1, 0, 1].map(offset => current.verticalIndex + offset)
                    .filter(index => index >= 0),
            horizontal:
                [-1, 0, 1].map(offset => current.horizontalIndex + offset)
                    .filter(index => index >= 0),
        };

        // Removes sections not to be drawn.
        const sections = {

            verticalHeader:
                this.sections.verticalHeader
                .map(entry => {
                    if (tobe.vertical.includes(entry.vidx)) {
                        return entry;
                    } else {
                        entry.dom.remove();
                        return null;
                    }
                })
                .filter(entry => entry !== null),

            horizontalHeader:
                this.sections.horizontalHeader
                .map(entry => {
                    if (tobe.horizontal.includes(entry.hidx)) {
                        return entry;
                    } else {
                        entry.dom.remove();
                        return null;
                    }
                })
                .filter(entry => entry !== null),

            body:
                this.sections.body
                .map(entry => {
                    if (tobe.vertical.includes(entry.vidx) && tobe.horizontal.includes(entry.hidx)) {
                        return entry;
                    } else {
                        entry.dom.remove();
                        return null;
                    }
                })
                .filter(entry => entry !== null),
        };

        // Additional sections to be drawn.
        const additions = {

            verticalHeader:
                tobe.vertical
                .filter(vidx => (
                    sections.verticalHeader
                    .some(entry => entry.vidx === vidx)
                    ? false : true
                ))
                .map(vidx => this.generateVerticalHeaderSection(vidx)),

            horizontalHeader:
                tobe.horizontal
                .filter(hidx =>
                    sections.horizontalHeader
                    .some(entry => entry.hidx === hidx)
                    ? false : true
                )
                .map(hidx => this.generateHorizontalHeaderSection(hidx)),

            body:
                tobe.vertical
                .flatMap(vidx =>
                    tobe.horizontal
                    .filter(hidx =>
                        sections.body
                        .some(entry => entry.vidx === vidx && entry.hidx === hidx)
                        ? false : true
                    )
                    .map(hidx => ({ vidx, hidx }))
                )
                .map(({vidx, hidx}) => this.generateBodySection(vidx, hidx)),
        };

        // Draw additional sections.
        additions.verticalHeader
            .map(entry => this.DOMS.verticalHeader.appendChild(entry.dom));
        additions.horizontalHeader
            .map(entry => this.DOMS.horizontalHeader.appendChild(entry.dom));
        additions.body
            .map(entry => this.DOMS.chartBody.appendChild(entry.dom));

        // Merge.
        sections.verticalHeader.push(...additions.verticalHeader);
        sections.horizontalHeader.push(...additions.horizontalHeader);
        sections.body.push(...additions.body);

        // Change the position of sections.
        sections.verticalHeader.map(entry => {
            const offsetRows = -1 * (this.currentRow - (this.SECTION_ROWS * entry.vidx));
            const offsetVerticalPx = offsetRows * this.cellSize;
            entry.dom.style.top = `${offsetVerticalPx}px`;
        });
        sections.horizontalHeader.map(entry => {
            const offsetColumns = -1 * (this.currentColumn - (this.SECTION_COLUMNS * entry.hidx));
            const offsetHorizontalPx = offsetColumns * this.cellSize;
            entry.dom.style.left = `${offsetHorizontalPx}px`;
        });
        sections.body.map(entry => {
            const offsetRows = -1 * (this.currentRow - (this.SECTION_ROWS * entry.vidx));
            const offsetVerticalPx = offsetRows * this.cellSize;
            const offsetColumns = -1 * (this.currentColumn - (this.SECTION_COLUMNS * entry.hidx));
            const offsetHorizontalPx = offsetColumns * this.cellSize;
            entry.dom.style.top = `${offsetVerticalPx}px`;
            entry.dom.style.left = `${offsetHorizontalPx}px`;
        });

        // Update this state.
        this.sections = sections;

        // Change cell sizes.
        this.STYLES.horizontalHeaderCell.width = `${this.cellSize}px`;
        this.STYLES.verticalHeaderCell.height = `${this.cellSize}px`;
        this.STYLES.chartBodyCell.width = `${this.cellSize}px`;
        this.STYLES.chartBodyCell.height = `${this.cellSize}px`;

        // Apply new cell size to section size.
        this.STYLES.horizontalHeaderSection.width = `${this.cellSize * this.SECTION_COLUMNS}px`;
        this.STYLES.verticalHeaderSection.height = `${this.cellSize * this.SECTION_ROWS}px`;
        this.STYLES.chartBodySection.width = `${this.cellSize * this.SECTION_COLUMNS}px`;
        this.STYLES.chartBodySection.height = `${this.cellSize * this.SECTION_ROWS}px`;

        // Apply new cell size to font sizes.
        this.STYLES.chartBodyGlyph.fontSize = `${this.cellSize * 0.4}px`;
        this.STYLES.chartBodyCodePoint.fontSize = `${this.cellSize * 0.1}px`;
    },

    generateVerticalHeaderSection(vidx) {

        const section = document.createElement("div");
        section.className = "section";

        for (let i = 0; i < this.SECTION_ROWS; i++) {
            const verticalCodeDecimal = (vidx * this.SECTION_ROWS) + i;
            const verticalCode = verticalCodeDecimal.toString(16).toUpperCase().padStart(2, "0");

            const cell = document.createElement("div");
            cell.className = "cell";
            cell.textContent = verticalCode;

            section.appendChild(cell);
        }

        return { vidx: vidx, dom: section};
    },

    generateHorizontalHeaderSection(hidx) {

        const section = document.createElement("div");
        section.className = "section";

        for (let i = 0; i < this.SECTION_COLUMNS; i++) {
            const horizontalCodeDecimal = (hidx * this.SECTION_COLUMNS) + i;
            const horizontalCode = horizontalCodeDecimal.toString(16).toUpperCase().padStart(2, "0");

            const cell = document.createElement("div");
            cell.className = "cell";
            cell.textContent = horizontalCode;

            section.appendChild(cell);
        }

        return { hidx: hidx, dom: section};
    },

    generateBodySection(vidx, hidx) {

        const section = document.createElement("div");
        section.className = "section";

        for (let v = 0; v < this.SECTION_ROWS; v++) {

            const verticalCodeDecimal = (vidx * this.SECTION_ROWS) + v;
            const verticalCode = verticalCodeDecimal.toString(16).padStart(2, "0");

            for (let h = 0; h < this.SECTION_COLUMNS; h++) {

                const horizontalCodeDecimal = (hidx * this.SECTION_COLUMNS) + h;
                const horizontalCode = horizontalCodeDecimal.toString(16).padStart(2, "0");

                const codePoint = `${verticalCode}${horizontalCode}`;

                const cell = document.createElement("div");
                cell.className = "cell";

                const glyph = document.createElement("div");
                glyph.className = "glyph";
                const codePointString = document.createElement("div");
                codePointString.className = "code-point";

                try {
                    glyph.textContent = String.fromCodePoint(parseInt(codePoint, 16));
                    codePointString.textContent = `U+${codePoint}`;
                } catch (error) {
                    if (error instanceof RangeError) {
                        glyph.textContent = "X"
                        codePointString.textContent = "x";
                    } else {
                        throw error;
                    }
                }

                cell.appendChild(glyph);
                cell.appendChild(codePointString);

                section.appendChild(cell);
            }
        }

        return { vidx: vidx, hidx: hidx, dom: section};
    },
}


// Initial drawing.
chart.updateContents();


const smoothScrolling = {

    DELTA_MAX: 3000,
    DELTA_MIN: -3000,
    id: null,
    delta: 0,

    goHorizontally(delta) {
        let next = this.delta + (delta * 10);
        if (next < this.DELTA_MIN) {
            next = this.DELTA_MIN;
        } else if (this.DELTA_MAX < next) {
            next = this.DELTA_MAX;
        }
        if (this.delta === next) return;
        this.stop();
        this.id = setInterval(() => chart.scrollHorizontally(next), 100);
        this.delta = next;
    },

    goVertically(delta) {
        let next = this.delta + (delta * 10);
        if (next < this.DELTA_MIN) {
            next = this.DELTA_MIN;
        } else if (this.DELTA_MAX < next) {
            next = this.DELTA_MAX;
        }
        if (this.delta === next) return;
        this.stop();
        this.id = setInterval(() => chart.scrollVertically(next), 100);
        this.delta = next;
    },

    stop() {
        clearInterval(this.id);
        this.delta = 0;
    }
}


const keys = {
    ctrl: false,
    shift: false,
    alt: false,

    /**
     * @param {KeyboardEvent} event
     */
    toggle(event) {
        keys.ctrl = event.ctrlKey;
        keys.shift = event.shiftKey;
        keys.alt = event.altKey;
    }
}

addEventListener("keydown", keys.toggle);
addEventListener("keyup", event => {
    keys.toggle(event);
    if (event.altKey === false) {
        smoothScrolling.stop();
    }
});


/**
 * @param {WheelEvent} event
 */
function handleWheel(event) {

    event.preventDefault();

    if (keys.ctrl) {
        chart.resizeCell(event.deltaY);
    } else if (keys.shift) {
        if (keys.alt) {
            smoothScrolling.goHorizontally(event.deltaY);
        } else {
            chart.scrollHorizontally(event.deltaY);
        }
    } else {
        if (keys.alt) {
            smoothScrolling.goVertically(event.deltaY);
        } else {
            chart.scrollVertically(event.deltaY);
        }
    }
}

document.getElementById("unicode-chart").addEventListener("wheel", handleWheel);
