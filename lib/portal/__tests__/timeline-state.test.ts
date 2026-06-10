import { describe, it, expect } from 'vitest';
import { timelineGeom, TODAY, type PortalProject, type PortalTask } from '../data';

const task = (over: Partial<PortalTask>): PortalTask => ({
  id: 't',
  title: 'Tarea',
  due: null,
  done: false,
  status: 'Not Started',
  assignee: null,
  mine: false,
  ...over,
});

const future = (() => {
  const d = new Date(TODAY + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 10);
  return d.toISOString().slice(0, 10);
})();
const past = '2020-01-01';

const project = (tasks: PortalTask[]): PortalProject => ({
  id: 'p',
  name: 'Proyecto',
  subtitle: '',
  pct: 50,
  deckHealth: 'track',
  healthDetail: '',
  pill: 'en curso',
  start: '2020-01-01',
  end: '2030-01-01',
  startLabel: '',
  endLabel: '',
  tasks,
});

describe('timelineGeom · estado de los puntos', () => {
  it('una tarea en progreso se distingue de las por venir', () => {
    const geom = timelineGeom(project([
      task({ status: 'In Progress', due: future }),
      task({ status: 'Not Started', due: future }),
    ]));
    expect(geom.dots.map((d) => d.state)).toEqual(['active', 'upcoming']);
  });

  it('done y atrasada tienen prioridad sobre en progreso', () => {
    const geom = timelineGeom(project([
      task({ status: 'In Progress', done: true, due: future }),
      task({ status: 'In Progress', due: past }),
    ]));
    expect(geom.dots.map((d) => d.state)).toEqual(['done', 'overdue']);
  });

  it('todos los estados running cuentan como activos', () => {
    const geom = timelineGeom(project(
      ['Running', 'Testing', 'In Review', 'PR Open'].map((status) => task({ status, due: future })),
    ));
    expect(geom.dots.every((d) => d.state === 'active')).toBe(true);
  });
});
