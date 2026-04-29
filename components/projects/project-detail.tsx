import type { Project } from '@/schemas/project';
import type { Task } from '@/schemas/task';
import type { Meeting } from '@/schemas/meeting';
import type { WikiPage } from '@/schemas/wiki';
import type { TeamMember } from '@/schemas/team-member';
import { ProjectHero } from './project-hero';
import { ProjectMetaRow } from './project-meta-row';
import { ProjectStats } from './project-stats';
import { ProjectTasksModule } from './project-tasks-module';
import { ProjectMeetingsModule } from './project-meetings-module';
import { ProjectTeamModule } from './project-team-module';
import { ProjectWikiModule } from './project-wiki-module';

type Props = {
  project: Project;
  tasks: Task[];
  meetings: Meeting[];
  wiki: WikiPage[];
  members: TeamMember[];
  ownerName: string | null;
  accentIndex: number;
};

export function ProjectDetail({
  project,
  tasks,
  meetings,
  wiki,
  members,
  ownerName,
  accentIndex,
}: Props) {
  const tasksDone = tasks.filter((t) => t.status === 'Done' || t.status === 'Archived').length;

  return (
    <>
      <ProjectHero project={project} accentIndex={accentIndex} />
      <ProjectMetaRow
        startDate={project.startDate}
        endDate={project.endDate}
        ownerName={ownerName}
        teamCount={project.teamIds.length}
      />
      <ProjectStats
        completion={project.completion}
        tasksDone={tasksDone}
        tasksTotal={tasks.length}
        meetingsCount={meetings.length}
        endDate={project.endDate}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3 lg:gap-4">
        <div className="flex flex-col gap-3 lg:gap-4 min-w-0">
          <ProjectTasksModule tasks={tasks} project={project} />
          <ProjectMeetingsModule meetings={meetings} />
        </div>
        <div className="flex flex-col gap-3 lg:gap-4 min-w-0">
          <ProjectTeamModule members={members} ownerName={ownerName} />
          <ProjectWikiModule pages={wiki} />
        </div>
      </div>
    </>
  );
}
