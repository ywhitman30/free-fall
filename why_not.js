function calculate_acceleration(initial_velocity, final_velocity, time_elapsed) {
  return (final_velocity - initial_velocity) / time_elapsed;
}

function calculate_final_velocity(initial_velocity, acceleration, time) {
  return initial_velocity + acceleration * time;
}

function calculate_initial_velocity(final_velocity, acceleration, time) {
  return final_velocity - acceleration * time;
}

function calculate_time(initial_velocity, final_velocity, acceleration) {
  return (final_velocity - initial_velocity) / acceleration;
}

function roundToPrecision(value) {
  const precision = Number(document.getElementById('roundingPrecision').value);
  return Number(value.toFixed(precision));
}

function clearCalculator() {
  document.getElementById('freeFallForm').reset();
  document.getElementById('result').textContent = '';
  document.getElementById('output').textContent = '';
}

(() => {
  const precisionSelect = document.getElementById('roundingPrecision');
  const resultContainers = [
    document.getElementById('result'),
    document.getElementById('output')
  ];
  const originalText = new WeakMap();
  const originalInputs = new WeakMap();

  function roundInputs(precision) {
    document.querySelectorAll('form input').forEach((input) => {
      const current = input.value;
      const saved = originalInputs.get(input);
      const source = saved && saved.rendered === current ? saved.source : current;
      const trimmed = source.trim();
      if (trimmed === '' || trimmed.toLowerCase() === 'x') return;

      const value = Number(trimmed);
      if (!Number.isFinite(value)) return;

      const rendered = String(Number(value.toFixed(precision)));
      originalInputs.set(input, { source, rendered });
      if (rendered !== current) input.value = rendered;
    });
  }

  function roundResults() {
    const precision = Number(precisionSelect.value);
    roundInputs(precision);
    resultContainers.forEach((container) => {
      if (!container) return;

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const current = node.data;
        const saved = originalText.get(node);
        const source = saved && saved.rendered === current ? saved.source : current;
        const rendered = source.replace(
          /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g,
          (match) => {
            const value = Number(match);
            return Number.isFinite(value)
              ? String(Number(value.toFixed(precision)))
              : match;
          }
        );

        originalText.set(node, { source, rendered });
        if (rendered !== current) node.data = rendered;
      }
    });
  }

  document.querySelectorAll('form input').forEach((input) => {
    input.addEventListener('input', () => originalInputs.delete(input));
    input.addEventListener('change', () => roundInputs(Number(precisionSelect.value)));
  });
  precisionSelect.addEventListener('change', roundResults);
  resultContainers.forEach((container) => {
    if (container) {
      new MutationObserver(roundResults).observe(container, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  });
})();

document.getElementById('freeFallForm').addEventListener('submit', function (event) {
  event.preventDefault();

  const ids = ['initial_velocity', 'final_velocity', 'acceleration', 'time', 'distance'];
  const fields = ids.map((id) => document.getElementById(id));
  const unknowns = fields.filter((field) => field.value.trim().toLowerCase() === 'x');
  const result = document.getElementById('result');

  if (unknowns.length !== 1) {
    result.textContent = 'Enter four values and mark exactly one unknown as x.';
    return;
  }

  const value = (id) => {
    const text = document.getElementById(id).value.trim();
    return text.toLowerCase() === 'x' ? null : Number(text);
  };

  const u = value('initial_velocity');
  const v = value('final_velocity');
  const a = value('acceleration');
  const t = value('time');
  const s = value('distance');
  let answer;

  if (u === null && v !== null && a !== null && t !== null) {
    answer = v - a * t;
  } else if (v === null && u !== null && a !== null && t !== null) {
    answer = round(u + a * t);
  } else if (a === null && u !== null && v !== null && t !== null && t !== 0) {
    answer = (v - u) / t;
  } else if (t === null && u !== null && v !== null && a !== null && a !== 0) {
    answer = (v - u) / a;
  } else if (s === null && u !== null && a !== null && t !== null) {
    answer = u * t + 0.5 * a * t * t;
  } else if (u === null && v !== null && s !== null && t !== null && t !== 0) {
    answer = 2 * s / t - v;
  } else if (v === null && u !== null && s !== null && t !== null && t !== 0) {
    answer = 2 * s / t - u;
  } else if (a === null && u !== null && s !== null && t !== null && t !== 0) {
    answer = 2 * (s - u * t) / (t * t);
  } else if (t === null && u !== null && v !== null && s !== null && u + v !== 0) {
    answer = 2 * s / (u + v);
  } else if (s === null && u !== null && v !== null && t !== null) {
    answer = (u + v) * t / 2;
  } else if (a === null && u !== null && v !== null && s !== null && s !== 0) {
    answer = (v * v - u * u) / (2 * s);
  } else if (s === null && u !== null && v !== null && a !== null && a !== 0) {
    answer = (v * v - u * u) / (2 * a);
  }

  if (answer !== undefined && Number.isFinite(answer)) {
    answer = roundToPrecision(answer);
  }

  if (
    answer === undefined ||
    !Number.isFinite(answer) ||
    fields.some((field) => field.value.toLowerCase() !== 'x' && !Number.isFinite(Number(field.value)))
  ) {
    result.textContent = 'These values do not determine the unknown.';
    return;
  }

  unknowns[0].value = String(answer);
  result.textContent = unknowns[0].labels[0].textContent.replace(':', '') + ' ' + answer;
});

window.clearCalculator = function () {
  document.getElementById('freeFallForm').reset();
  document.getElementById('result').textContent = '';
  document.getElementById('output').textContent = '';
};

const g = 9.8;

function normalized(value) {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

function get_form_input(form, keys) {
  const candidates = Array.from(form.querySelectorAll('input'));
  return candidates.find((input) => {
    const labelText = input.labels
      ? Array.from(input.labels, (label) => label.textContent).join(' ')
      : '';
    const names = [input.name, input.id, input.placeholder, labelText].map(normalized);
    return names.some((name) => keys.includes(name));
  });
}

function parse_input(input, allow_gravity = false) {
  const value = input.value.trim().toLowerCase();
  if (value === 'x') return null;
  if (allow_gravity && value === 'g') return g;

  const number = Number(value);
  if (value === '' || !Number.isFinite(number)) {
    throw new Error('Enter a number, or x for the value to calculate.');
  }
  return number;
}

function calculate_from_form(form) {
  const inputs = {
    initial_velocity: get_form_input(form, ['initialvelocity', 'initialvel', 'u', 'vi']),
    final_velocity: get_form_input(form, ['finalvelocity', 'finalvel', 'v', 'vf']),
    acceleration: get_form_input(form, ['acceleration', 'accel', 'a']),
    time: get_form_input(form, ['time', 'elapsedtime', 't'])
  };

  if (Object.values(inputs).some((input) => !input)) {
    throw new Error('The form must have inputs for initial velocity, final velocity, acceleration, and time.');
  }

  let initial_velocity = parse_input(inputs.initial_velocity);
  let final_velocity = parse_input(inputs.final_velocity);
  let acceleration = parse_input(inputs.acceleration, true);
  let time = parse_input(inputs.time);
  const unknowns = [initial_velocity, final_velocity, acceleration, time];

  if (unknowns.filter((value) => value === null).length !== 1) {
    throw new Error('Enter x in exactly one input for the value to calculate.');
  }

  if (initial_velocity === null) {
    initial_velocity = roundToPrecision(calculate_initial_velocity(final_velocity, acceleration, time));
    inputs.initial_velocity.value = initial_velocity;
    return `The initial velocity is ${initial_velocity} m/s`;
  }

  if (final_velocity === null) {
    final_velocity = roundToPrecision(calculate_final_velocity(initial_velocity, acceleration, time));
    inputs.final_velocity.value = final_velocity;
    return `The final velocity is ${final_velocity} m/s`;
  }

  if (acceleration === null) {
    if (time === 0) throw new Error('Time must not be zero to calculate acceleration.');
    acceleration = roundToPrecision(calculate_acceleration(initial_velocity, final_velocity, time));
    inputs.acceleration.value = acceleration;
    return `The acceleration is ${acceleration} m/s²`;
  }

  if (acceleration === 0) throw new Error('Acceleration must not be zero to calculate time.');
  time = roundToPrecision(calculate_time(initial_velocity, final_velocity, acceleration));
  inputs.time.value = time;
  return `The time is ${time} s`;
}

document.querySelectorAll('form').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let result = form.querySelector('[data-result], #result, #output, output');

    if (!result) {
      result = document.createElement('p');
      result.setAttribute('data-result', '');
      form.append(result);
    }

    try {
      result.textContent = calculate_from_form(form);
    } catch (error) {
      result.textContent = error.message;
    }
  });
});