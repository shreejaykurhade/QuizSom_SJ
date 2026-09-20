import { redirect } from 'next/navigation';

export default function TeacherLoginPage() {
  redirect('/auth?role=faculty&next=%2Fteacher%2Fdashboard');
}
