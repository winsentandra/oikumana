/**
 * A spring described the way Apple's designers describe one: **damping ratio**
 * (overshoot — 1 is critically damped, below 1 bounces) and **response** (how
 * quickly it reaches the target, in seconds). Not mass/stiffness, and not a
 * duration — a spring has no fixed duration, its settle time falls out of the
 * parameters and the velocity it started with.
 *
 * Solved analytically rather than integrated step by step, so a frame drop
 * can't accumulate error, and re-targeting mid-flight is exact: the new
 * spring starts from the position *and velocity* the old one was at, which is
 * what keeps a reversed gesture from hitting a velocity brick wall.
 */
export type SpringOptions = {
  from: number;
  to: number;
  /** Initial velocity in px/s — hand it the gesture's release velocity. */
  velocity?: number;
  /** 1 = no overshoot. ~0.8 for motion that followed a flick. */
  damping?: number;
  /** Seconds to reach the target. Lower is snappier. */
  response?: number;
  onUpdate: (value: number, velocity: number) => void;
  onRest?: () => void;
};

export type SpringHandle = {
  /** Stops the animation and reports where it got to. */
  stop: () => { value: number; velocity: number };
};

/** Below these, the eye can't tell it apart from settled. */
const REST_DISPLACEMENT = 0.4; // px
const REST_VELOCITY = 8; // px/s

export function spring({
  from,
  to,
  velocity = 0,
  damping = 1,
  response = 0.4,
  onUpdate,
  onRest,
}: SpringOptions): SpringHandle {
  const omega = (2 * Math.PI) / response;
  const zeta = Math.max(0.05, damping);
  const delta = from - to;

  // Closed form of d'' + 2ζω d' + ω² d = 0 with d(0) = delta, d'(0) = velocity,
  // where d is the displacement from the target.
  let displacementAt: (t: number) => number;
  let velocityAt: (t: number) => number;

  if (zeta < 1) {
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    const a = delta;
    const b = (velocity + zeta * omega * delta) / omegaD;
    displacementAt = (t) =>
      Math.exp(-zeta * omega * t) * (a * Math.cos(omegaD * t) + b * Math.sin(omegaD * t));
    velocityAt = (t) =>
      Math.exp(-zeta * omega * t) *
      ((-zeta * omega * a + omegaD * b) * Math.cos(omegaD * t) -
        (zeta * omega * b + omegaD * a) * Math.sin(omegaD * t));
  } else {
    const a = delta;
    const b = velocity + omega * delta;
    displacementAt = (t) => (a + b * t) * Math.exp(-omega * t);
    velocityAt = (t) => (b - omega * (a + b * t)) * Math.exp(-omega * t);
  }

  const start = performance.now();
  let frame = 0;
  let live = true;
  let lastValue = from;
  let lastVelocity = velocity;

  const tick = (now: number) => {
    const t = (now - start) / 1000;
    const d = displacementAt(t);
    const v = velocityAt(t);
    lastValue = to + d;
    lastVelocity = v;

    if (Math.abs(d) < REST_DISPLACEMENT && Math.abs(v) < REST_VELOCITY) {
      live = false;
      lastValue = to;
      lastVelocity = 0;
      onUpdate(to, 0);
      onRest?.();
      return;
    }

    onUpdate(lastValue, v);
    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);

  return {
    stop() {
      if (live) {
        live = false;
        cancelAnimationFrame(frame);
      }
      return { value: lastValue, velocity: lastVelocity };
    },
  };
}

/**
 * Where a flick comes to rest, using the same exponential-decay model as
 * scroll deceleration. Velocity in px/s.
 */
export function projectMomentum(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}
