import ProjectWorkspace from "../../pages/ProjectWorkspace";

export default function ProjectPage({ params }: { params: { projectId: string } }) {
  return <ProjectWorkspace projectId={params.projectId} />;
}
