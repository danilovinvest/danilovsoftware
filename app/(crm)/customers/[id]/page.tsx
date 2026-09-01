import { RequireAuth } from "@/modules/auth";
import { CustomerDetailView } from "@/modules/customers";

export default async function CustomerPage(props: PageProps<"/customers/[id]">) {
  const { id } = await props.params;

  return (
    <RequireAuth permission="customers:read">
      <CustomerDetailView customerId={id} />
    </RequireAuth>
  );
}
