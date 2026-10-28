import { AdminOverviewSwitch } from "@/components/admin/admin-overview-switch"
import { Stats } from "@/components/admin/dashboard/stats"
import { SupportTicketChart } from "@/components/admin/dashboard/support-ticket-chart"
import { UserGrowthChart } from "@/components/admin/dashboard/user-growth-chart"

export default async function DashboardPage() {
    return (
        <AdminOverviewSwitch>
            <div className="flex flex-col gap-4">
                <Stats />
                <div className="grid grid-cols-8 gap-4">
                    <div className="col-span-8 md:col-span-5">
                        <UserGrowthChart />
                    </div>
                    <div className="col-span-8 md:col-span-3 h-full">
                        <SupportTicketChart />
                    </div>
                </div>
            </div>
        </AdminOverviewSwitch>
    )
}