# Indiranagar Steps

An interactive p5.js sketch that lets you climb staircases in Indiranagar by moving your mouse (or tapping on mobile) — made during a codewalk with Chaitali.

## How it works

- 5 pairs of staircase photos are preloaded: `L-1.jpg`–`L-5.jpg` (left-leaning stairs) and `R-1.jpg`–`R-5.jpg` (right-leaning stairs).
- On each mouse move, the sketch checks if the cursor has moved far enough from the last photo position (threshold: 5% of canvas width in both axes). If so, it places a randomly chosen photo at the cursor, sized to match the distance travelled.
- The photo direction is picked by the diagonal: moving top-right or bottom-left uses `L` images; moving top-left or bottom-right uses `R` images — mimicking the alternating lean of stair steps.
- On mobile, each tap does the same calculation from the previous tap position.
- Clicking/pressing clears the canvas.
