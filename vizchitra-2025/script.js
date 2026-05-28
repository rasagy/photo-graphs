// Load the data and then create the visualization
async function createVisualization() {
  try {
    const metadata = await d3.csv('metadata.csv');  // Load your CSV file

    // 1. --- SETUP AND DIMENSIONS ---
    const width = 900;
    const height = 900;
    const plotRadius = Math.min(width, height) / 2 - 50;

    // 2. --- SCALES ---
    const angleScale = d3.scaleLinear().domain([6, 18]).range([0.5 * Math.PI, 2.5 * Math.PI]);
    const radiusScale = d3.scaleLinear().domain([0, 59]).range([plotRadius / 5, plotRadius]);


    // Helper: height-to-width ratio from dimensions string (e.g. "4032x3024")
    function getAspectRatio(d) {
      const [w, h] = d.dimensions.split("x").map(Number);
      return h / w;
    }

    // Helper: convert "HH:MM:SS" to "H:MM AM/PM"
    function formatTime(t) {
      const [h, m] = t.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    }

    // Thumbnail base width: 25px horizontal, 20px vertical
    function thumbW(d) { return d.orientation === "horizontal" ? 25 : 20; }
    const HOVER_SCALE = 4;

    // Filter state
    const activeTypes = new Set(["JPG", "HEIC", "MOV"]);
    const activeOrientations = new Set(["horizontal", "vertical"]);

    function targetOpacity(d) {
      return activeTypes.has(d.extension) && activeOrientations.has(d.orientation) ? 0.5 : 0;
    }

    function updateVisibility() {
      shapes.transition().duration(300)
        .attr("opacity", targetOpacity)
        .style("pointer-events", (d) => targetOpacity(d) > 0 ? null : "none");
    }

    // 3. --- CREATE SVG AND PLOT GROUP ---
    const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .style("font", "10px sans-serif");

    svg.append("text")
      .attr("x", -width / 2 + 20)
      .attr("y", -height / 2 + 30)
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text("Visualizing a day of VizChitra 2025");

    document.body.appendChild(svg.node());  // Append SVG to the body

    // --- MODAL LIGHTBOX ---
    function createModal() {
      const overlay = document.createElement("div");
      overlay.id = "photo-modal";
      const card = document.createElement("div"); card.id = "photo-modal-card";
      const inner = document.createElement("div"); inner.id = "photo-modal-inner";
      const caption = document.createElement("div"); caption.id = "photo-modal-caption";
      card.appendChild(inner); card.appendChild(caption);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      function close() {
        overlay.classList.remove("is-open");
        document.body.classList.remove("modal-open");
        inner.innerHTML = "";
        caption.textContent = "";
      }
      overlay.addEventListener("click", close);
      card.addEventListener("click", e => e.stopPropagation());
      document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

      function open(d) {
        const tilt = (Math.random() * 6 - 3).toFixed(2) + "deg";
        card.style.setProperty("--modal-tilt", tilt);
        inner.innerHTML = "";
        const isVideo = d.extension === "MOV";
        if (isVideo) {
          const vid = document.createElement("video");
          vid.src = `assets_hires/${d.name}.mp4`;
          vid.controls = true; vid.autoplay = true;
          vid.addEventListener("loadedmetadata", () => {
            const maxW = Math.min(window.innerWidth * 0.84, 1000);
            const maxH = window.innerHeight * 0.72;
            const ratio = vid.videoWidth / vid.videoHeight;
            let w = vid.videoWidth, h = vid.videoHeight;
            if (w > maxW) { w = maxW; h = w / ratio; }
            if (h > maxH) { h = maxH; w = h * ratio; }
            vid.style.width = Math.round(w) + "px";
            vid.style.height = Math.round(h) + "px";
          });
          inner.appendChild(vid);
        } else {
          const img = document.createElement("img");
          img.src = `assets_hires/${d.name}.jpg`;
          img.alt = "";
          inner.appendChild(img);
        }
        const type = isVideo ? "Video" : "Photo";
        const time = formatTime(d.time_created);
        const dur = isVideo && d.duration ? ` · ${Math.round(+d.duration)}s` : "";
        caption.textContent = `${type} · ${time}${dur}`;
        overlay.classList.add("is-open");
        document.body.classList.add("modal-open");
      }
      return { open, close };
    }
    const modal = createModal();

    const plotGroup = svg.append("g").attr("class", "plot-group");

    // 4. --- ADD RADIAL GRIDLINES FOR HOURS ---
    const gridGroup = plotGroup.append("g").attr("class", "gridlines");

    gridGroup.selectAll("circle.radial-ring")
      .data([60, 45, 30, 15, 0])
      .join("circle")
      .attr("class", "radial-ring")
      .attr("r", (d) => radiusScale(d))
      .attr("fill", (d) => d === 0 ? "white" : "rgba(0,0,0,0.02)")
      .attr("stroke", "none");

    const hours = d3.range(6, 19);

    gridGroup.selectAll("line")
      .data(hours)
      .join("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", (d) => plotRadius * Math.cos(angleScale(d)))
      .attr("y2", (d) => plotRadius * Math.sin(angleScale(d)))
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.7)
      .attr("stroke-dasharray", "1,4")
      .attr("stroke-linecap", "round");

    gridGroup.selectAll("text.hour-label")
      .data(hours)
      .join("text")
      .attr("x", (d) => (plotRadius + 25) * Math.cos(angleScale(d)))
      .attr("y", (d) => (plotRadius + 25) * Math.sin(angleScale(d)))
      .attr("text-anchor", (d) => {
        const angle = angleScale(d);
        const deg = ((angle * 180) / Math.PI) % 360;
        if (deg >= 45 && deg < 135) return "end";
        if (deg >= 225 && deg < 315) return "start";
        return "middle";
      })
      .attr("dominant-baseline", (d) => {
        const angle = angleScale(d);
        const deg = ((angle * 180) / Math.PI) % 360;
        if (deg >= 0 && deg < 90) return "hanging";
        return "auto";
      })
      .attr("fill", "#666")
      .attr("font-size", "12px")
      .text((d) => {
        if (d === 6) return "6PM";
        if (d === 12) return "12PM";
        if (d === 18) return "6PM";
        return d > 12 ? `${d - 12}PM` : `${d}AM`;
      });

    // 4.2 --- ADD SPIRAL AXES ---
    const spiralGroup = plotGroup.append("g").attr("class", "spirals");
    d3.range(6, 19).forEach((hour) => {
      const spiralData = d3.range(0, 60).map((minute) => {
        const angle = angleScale(hour + minute / 60);
        const r = radiusScale(minute);
        return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
      });
      const spiralLine = d3.line().x(d => d.x).y(d => d.y);
      spiralGroup.append("path")
        .datum(spiralData)
        .attr("d", spiralLine)
        .attr("fill", "none")
        .attr("stroke", "#ddd")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");
    });

    // 5. --- ANNOTATIONS ---
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
    }

    function arcMidPos(startHour, startMin, endHour, endMin) {
      const a1 = timeToAngle(startHour, startMin);
      const a2 = timeToAngle(endHour, endMin);
      const aMid = (a1 + a2) / 2;
      const r = annotationArcR;
      return { x: r * Math.cos(aMid), y: r * Math.sin(aMid) };
    }

    const annotationArcGroup = plotGroup.append("g").attr("class", "annotation-arcs").attr("opacity", 0);

    // Setup arc: 8:00AM – 9:15AM
    annotationArcGroup.append("path")
      .attr("d", annotationArcPath(8, 0, 9, 15))
      .attr("fill", "none").attr("stroke", "#E07B39").attr("stroke-width", 3).attr("stroke-linecap", "round");

    // Panel arc: 2:30PM – 3:15PM
    annotationArcGroup.append("path")
      .attr("d", annotationArcPath(14, 30, 15, 15))
      .attr("fill", "none").attr("stroke", "#6A4E9C").attr("stroke-width", 3).attr("stroke-linecap", "round");

    const setupPos = arcMidPos(8, 0, 9, 15);
    const panelPos = arcMidPos(14, 30, 15, 15);

    // Point annotation: IMG_0149 at 12:58 (hour=12, minute=58)
    const lunchAngle = timeToAngle(12, 58);
    const lunchR = d3.scaleLinear().domain([0, 59]).range([plotRadius / 5, plotRadius])(58);
    const lunchPos = { x: lunchR * Math.cos(lunchAngle), y: lunchR * Math.sin(lunchAngle) };

    const annotations = [
      {
        note: { title: "Setup", bgPadding: 5 },
        x: setupPos.x, y: setupPos.y,
        dx: -20, dy: -35,
        color: "#E07B39"
      },
      {
        note: { title: "Panel", bgPadding: 5 },
        x: panelPos.x, y: panelPos.y,
        dx: 20, dy: -40,
        color: "#6A4E9C"
      },
      {
        note: { title: "Group photo at Lunch!", wrap: 100, bgPadding: 5 },
        x: lunchPos.x, y: lunchPos.y,
        dx: 45, dy: -30,
        color: "#2A7D4F"
      }
    ];

    const makeAnnotations = d3.annotation()
      .type(d3.annotationCallout)
      .annotations(annotations);

    annotationArcGroup.append("g")
      .attr("class", "d3-annotation")
      .call(makeAnnotations);

    // Fade in after all photos finish animating (max delay 2500ms + duration 900ms)
    annotationArcGroup.transition()
      .delay(3500)
      .duration(600)
      .attr("opacity", 1);

    // 6. --- DRAW THUMBNAILS ---
    const defs = svg.append("defs");

    const shapes = plotGroup.selectAll("g.shape")
      .data(metadata)
      .join("g")
      .attr("class", "shape")
      .attr("transform", "translate(0, 0)")
      .attr("opacity", 0);

    shapes.each(function(d, i) {
      const w = thumbW(d), h = w * getAspectRatio(d);
      defs.append("clipPath")
        .attr("id", `thumb-clip-${i}`)
        .append("rect")
          .attr("x", -w / 2).attr("y", -h / 2)
          .attr("width", w).attr("height", h)
          .attr("rx", 5).attr("ry", 5);
    });

    shapes.transition()
      .duration(900)
      .delay((d) => d3.scaleLinear().domain([6 * 60, 18 * 60]).range([0, 2500])(+d.hour * 60 + +d.minute))
      .attr("opacity", 0.5)
      .attr("transform", (d) => {
        const angle = angleScale(+d.hour + +d.minute / 60);
        const r = radiusScale(+d.minute);
        return `translate(${r * Math.cos(angle)}, ${r * Math.sin(angle)})`;
      });

    shapes.append("image")
      .attr("href", (d) => {
        const isPhoto = ["JPG", "HEIC"].includes(d.extension);
        const ext = isPhoto ? "JPG" : "jpg";  // uppercase for photos, lowercase for videos
        return `assets/${d.name}_thumb.${ext}`;
      })
      .attr("width", (d) => thumbW(d))
      .attr("height", (d) => thumbW(d) * getAspectRatio(d))
      .attr("x", (d) => -thumbW(d) / 2)
      .attr("y", (d) => -(thumbW(d) * getAspectRatio(d)) / 2)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("clip-path", (d, i) => `url(#thumb-clip-${i})`);

    shapes.append("rect")
      .attr("class", "thumb-border")
      .attr("width", (d) => thumbW(d))
      .attr("height", (d) => thumbW(d) * getAspectRatio(d))
      .attr("x", (d) => -thumbW(d) / 2)
      .attr("y", (d) => -(thumbW(d) * getAspectRatio(d)) / 2)
      .attr("rx", 5).attr("ry", 5)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("pointer-events", "none");

    // Inline metadata label for photos (shown on hover)
    shapes.filter((d) => ["JPG", "HEIC"].includes(d.extension))
      .append("g")
      .attr("class", "info-label")
      .attr("transform", (d) => {
        const enlargedH = thumbW(d) * HOVER_SCALE * getAspectRatio(d);
        return `translate(0, ${enlargedH / 2 + 4})`;
      })
      .style("display", "none")
      .each(function(d) {
        const g = d3.select(this);
        g.append("rect")
          .attr("x", -30).attr("y", -3)
          .attr("width", 60).attr("height", 15)
          .attr("rx", 4).attr("ry", 4)
          .attr("fill", "white").attr("opacity", 0.9);
        g.append("text").attr("y", 9).attr("text-anchor", "middle").attr("font-size", "9px").attr("fill", "#333").text(formatTime(d.time_created));
      });

    // Inline metadata label for videos (shown on hover)
    shapes.filter((d) => !["JPG", "HEIC"].includes(d.extension))
      .append("g")
      .attr("class", "info-label")
      .attr("transform", (d) => {
        const enlargedH = thumbW(d) * HOVER_SCALE * getAspectRatio(d);
        return `translate(0, ${enlargedH / 2 + 4})`;
      })
      .style("display", "none")
      .each(function(d) {
        const g = d3.select(this);
        g.append("rect")
          .attr("x", -30).attr("y", -3)
          .attr("width", 60).attr("height", 15)
          .attr("rx", 4).attr("ry", 4)
          .attr("fill", "white").attr("opacity", 0.9);
        g.append("text").attr("y", 9).attr("text-anchor", "middle").attr("font-size", "9px").attr("fill", "#333").text(formatTime(d.time_created));
      });

    // 7. --- INTERACTIVITY ---

    function resizeClip(i, w, h) {
      defs.select(`#thumb-clip-${i} rect`)
        .attr("x", -w / 2).attr("y", -h / 2)
        .attr("width", w).attr("height", h);
    }

    let activeNode = null;

    function collapseNode(node) {
      if (!node) return;
      const g = d3.select(node);
      const d = g.datum();
      const i = shapes.nodes().indexOf(node);
      const w = thumbW(d);
      const h = w * getAspectRatio(d);
      g.attr("opacity", targetOpacity(d));
      g.classed("active-node", false);
      g.select("image").transition().duration(150)
        .attr("width", w).attr("height", h).attr("x", -w / 2).attr("y", -h / 2);
      g.select(".thumb-border").transition().duration(150)
        .attr("width", w).attr("height", h).attr("x", -w / 2).attr("y", -h / 2);
      resizeClip(i, w, h);
      g.select(".info-label").style("display", "none");
    }

    function expandNode(node, d) {
      if (activeNode !== node) collapseNode(activeNode);
      activeNode = node;
      const i = shapes.nodes().indexOf(node);
      const g = d3.select(node);
      g.raise();
      g.attr("opacity", 1);
      g.classed("active-node", true);
      d3.select(node.parentNode).classed("has-active", true);
      const w = thumbW(d) * HOVER_SCALE;
      const h = w * getAspectRatio(d);
      g.select("image").transition().duration(150)
        .attr("width", w).attr("height", h).attr("x", -w / 2).attr("y", -h / 2);
      g.select(".thumb-border").transition().duration(150)
        .attr("width", w).attr("height", h).attr("x", -w / 2).attr("y", -h / 2);
      resizeClip(i, w, h);
      g.select(".info-label").style("display", null);
    }

    function onLeave(node, d) {
      if (activeNode === node) activeNode = null;
      collapseNode(node);
      if (activeNode === null) d3.select(node.parentNode).classed("has-active", false);
    }

    shapes.on("mouseover", function(event, d) { expandNode(this, d); })
          .on("mouseleave", function(event, d) { onLeave(this, d); });

    // Click any thumbnail to open modal lightbox
    shapes.on("click", function(event, d) {
      event.stopPropagation();
      modal.open(d);
    });

    // 8. --- FILTERS ---
    function makeButton(parent, x, y, w, label, getActive, onToggle) {
      const btn = parent.append("g").attr("transform", `translate(${x}, ${y})`).style("cursor", "pointer");
      const bg = btn.append("rect").attr("width", w).attr("height", 20).attr("rx", 4)
        .attr("fill", getActive() ? "#333" : "#eee")
        .attr("stroke", "#bbb").attr("stroke-width", 0.5);
      const txt = btn.append("text").attr("x", w / 2).attr("y", 13).attr("text-anchor", "middle")
        .attr("font-size", "10px").attr("fill", getActive() ? "white" : "#888").text(label);
      btn.on("click", () => {
        onToggle();
        bg.attr("fill", getActive() ? "#333" : "#eee");
        txt.attr("fill", getActive() ? "white" : "#888");
        updateVisibility();
      });
    }

    const filterPanel = svg.append("g").attr("transform", "translate(300, -350)");

    filterPanel.append("text").attr("y", 0).attr("font-size", "9px").attr("fill", "#aaa").attr("letter-spacing", 1).text("TYPE");
    makeButton(filterPanel, 0, 8, 58, "Photos",
      () => activeTypes.has("JPG"),
      () => { if (activeTypes.has("JPG")) { activeTypes.delete("JPG"); activeTypes.delete("HEIC"); } else { activeTypes.add("JPG"); activeTypes.add("HEIC"); } }
    );
    makeButton(filterPanel, 64, 8, 52, "Videos",
      () => activeTypes.has("MOV"),
      () => { if (activeTypes.has("MOV")) activeTypes.delete("MOV"); else activeTypes.add("MOV"); }
    );

    filterPanel.append("text").attr("y", 46).attr("font-size", "9px").attr("fill", "#aaa").attr("letter-spacing", 1).text("ORIENTATION");
    makeButton(filterPanel, 0, 54, 72, "Horizontal",
      () => activeOrientations.has("horizontal"),
      () => { if (activeOrientations.has("horizontal")) activeOrientations.delete("horizontal"); else activeOrientations.add("horizontal"); }
    );
    makeButton(filterPanel, 78, 54, 54, "Vertical",
      () => activeOrientations.has("vertical"),
      () => { if (activeOrientations.has("vertical")) activeOrientations.delete("vertical"); else activeOrientations.add("vertical"); }
    );

  } catch (error) {
    console.error("Error loading data:", error);
  }
}

createVisualization();  // Run the function
