# d3-annotation Reference

## Annotation Types

| Type | Description |
|---|---|
| `d3.annotationLabel` | Plain label, no connector |
| `d3.annotationCallout` | Straight line connector |
| `d3.annotationCalloutElbow` | Two-segment elbow connector |
| `d3.annotationCalloutCurve` | Curved connector (control points customizable) |
| `d3.annotationCalloutCircle` | Subject is a circle (radius configurable) |
| `d3.annotationCalloutRect` | Subject is a rectangle |
| `d3.annotationXYThreshold` | Horizontal or vertical threshold line |
| `d3.annotationBadge` | Small badge/circle with a letter or symbol |

You can mix types per annotation by setting `type` inside each annotation object rather than on the generator.

---

## Per-annotation position properties

```js
{
  x: 191, y: -345,   // subject point (where connector starts)
  dx: 45, dy: -30,   // offset to the note box from subject

  // For curve type only — control points for the bezier connector:
  connector: { points: [[10, -20], [30, -40]] },

  // For circle type — radius of the subject circle:
  subject: { radius: 20, radiusPadding: 5 },

  // For rect type:
  subject: { width: 60, height: 40 }
}
```

---

## Note (label box) customizations

```js
note: {
  title: "Group photo at Lunch!",
  label: "optional subtitle line",
  wrap: 120,           // text wrapping width in px
  wrapSplitter: /\n/,  // custom line-break rule
  bgPadding: 8,        // padding around text background
  padding: 5,          // padding between connector and note
  align: "middle",     // "left" | "right" | "middle" (note box alignment relative to connector)
  lineType: "vertical" // draws a vertical rule beside the text; "horizontal" also works
}
```

---

## Connector customizations

```js
connector: {
  type: "elbow",    // override: "line" | "elbow" | "curve" | "arrow"
  end: "arrow",     // arrowhead at subject end: "arrow" | "dot" | null
  points: 2,        // for elbow: number of bend points (1 or 2)
}
```

---

## Global styling on the generator

```js
d3.annotation()
  .type(d3.annotationCalloutElbow)
  .accessors({ x: d => d.x, y: d => d.y })  // if driving from data
  .on("subjectover", fn)   // hover events
  .on("noteover", fn)
```

Annotations are also styled with CSS — the library adds classes like `.annotation`, `.annotation-note`, `.annotation-subject`, `.annotation-connector` so you can target them in a stylesheet.

---

## Annotating a time range on the radial chart

The chart maps **hour → angle** and **minute → radius**. To annotate a span of time, `annotationArcPath` draws an SVG arc at a fixed radius just outside the plot, then a `d3.annotationCallout` label is anchored to the midpoint of that arc.

### Helper: `annotationArcPath(startHour, startMin, endHour, endMin)`

Draws a clockwise arc at `plotRadius + 10` from the start time to the end time.

```js
const annotationArcR = plotRadius + 10;

function timeToAngle(hour, minute) {
  return angleScale(hour + minute / 60);
}

function annotationArcPath(startHour, startMin, endHour, endMin) {
  const r = annotationArcR;
  const a1 = timeToAngle(startHour, startMin);
  const a2 = timeToAngle(endHour, endMin);
  const x1 = r * Math.cos(a1), y1 = r * Math.sin(a1);
  const x2 = r * Math.cos(a2), y2 = r * Math.sin(a2);
  const large = (a2 - a1) > Math.PI ? 1 : 0;
  return `M ${x1},${y1} A ${r},${r} 0 ${large},1 ${x2},${y2}`;
  //                                         sweep=1 → clockwise
}
```

### Example: annotating "Setup" (8:00 AM – 9:15 AM)

```js
// Draw the arc bracket
annotationArcGroup.append("path")
  .attr("d", annotationArcPath(8, 0, 9, 15))
  .attr("fill", "none")
  .attr("stroke", "#E07B39")
  .attr("stroke-width", 3)
  .attr("stroke-linecap", "round");

// Anchor the label to the arc's midpoint
function arcMidPos(startHour, startMin, endHour, endMin) {
  const a1 = timeToAngle(startHour, startMin);
  const a2 = timeToAngle(endHour, endMin);
  const aMid = (a1 + a2) / 2;
  return { x: annotationArcR * Math.cos(aMid), y: annotationArcR * Math.sin(aMid) };
}

const setupPos = arcMidPos(8, 0, 9, 15);

const makeAnnotations = d3.annotation()
  .type(d3.annotationCallout)
  .annotations([{
    note: { title: "Setup", bgPadding: 5 },
    x: setupPos.x, y: setupPos.y,
    dx: -20, dy: -35,
    color: "#E07B39"
  }]);

annotationArcGroup.append("g").call(makeAnnotations);
```

> **Note on SVG arc flags:** `large-arc-flag` is `0` for spans under 6 hours (< 180°) and `1` for longer spans. `sweep-flag=1` ensures the arc travels clockwise, matching the chart's direction.
