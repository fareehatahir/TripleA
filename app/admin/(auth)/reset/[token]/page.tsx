import { ResetForm } from "./reset-form";

export const metadata = { title: "Choose a new password" };

export default async function ResetPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return (
    <>
      <h1 className="text-3xl font-bold">Choose a new password</h1>
      <p className="mt-2 text-sm">Use at least 10 characters with a letter and a number.</p>
      <ResetForm token={params.token} />
    </>
  );
}
