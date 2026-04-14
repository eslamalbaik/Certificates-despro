import React, { useEffect, useState } from "react";
import {
  Typography,
  Card,
  CardHeader,
  CardBody,
  Chip,
} from "@material-tailwind/react";
import Chart from "react-apexcharts";
import {
  ArrowDownTrayIcon,
  UsersIcon,
  AcademicCapIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { GlassPod } from "@/widgets/cards/GlassPod";
import api from "@/configs/api";

export function Home() {
  const [stats, setStats] = useState({
    totalCerts: 0,
    uniqueStudents: 0,
    totalDownloads: 0
  });
  const [courseDemand, setCourseDemand] = useState([]);
  const [downloadLogs, setDownloadLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, demandRes, logsRes] = await Promise.all([
          api.get("/certificates/stats"),
          api.get("/certificates/stats/course-demand"),
          api.get("/certificates/stats/download-logs")
        ]);
        
        setStats(statsRes.data);
        setCourseDemand(demandRes.data);
        setDownloadLogs(logsRes.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const sparklineOptions = (color) => ({
    chart: { sparkline: { enabled: true }, toolbar: { show: false } },
    stroke: { curve: "smooth", width: 2 },
    colors: [color],
    tooltip: { enabled: false },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05 }
    }
  });

  const donutOptions = {
    chart: { type: "donut" },
    stroke: { show: false },
    colors: ["#3b82f6", "#10b981", "#ec4899", "#8b5cf6"],
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "75%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "الشهادات",
              formatter: () => stats.totalCerts,
              color: "#334155"
            }
          }
        }
      }
    }
  };

  const isometricChartOptions = {
    chart: {
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '45%',
        borderRadius: 8,
      }
    },
    colors: ["#3b82f6", "#10b981", "#ec4899", "#8b5cf6", "#f59e0b"],
    dataLabels: { enabled: false },
    grid: {
      borderColor: "rgba(0, 0, 0, 0.05)",
      strokeDashArray: 4,
    },
    xaxis: {
      categories: courseDemand.map(d => d.course),
      labels: { style: { colors: "#64748b" } }
    },
    yaxis: {
      labels: { style: { colors: "#64748b" } }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: "vertical",
        opacityFrom: 0.85,
        opacityTo: 0.55,
      }
    }
  };

  return (
    <div className="mt-12 flex flex-col gap-12 font-arabic rtl text-right" dir="rtl">
      {/* Glowing Data Pods */}
      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Downloads Pod */}
        <GlassPod
          title="إجمالي التحميلات"
          value={stats.totalDownloads || 3}
          icon={<ArrowDownTrayIcon className="w-6 h-6 text-green-400" />}
          className="glass-card-green"
          footer={
            <div className="flex items-center gap-2">
               <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
               <Typography variant="small" className="text-green-400 font-bold">
                 تتبع اللحظي (نشط)
               </Typography>
            </div>
          }
        >
          <div className="h-16 mt-2">
            <Chart 
              options={sparklineOptions("#10b981")} 
              series={[{ data: [12, 14, 2, 47, 42, 15, 47, 75, 65, 19, 14] }]} 
              type="area" 
              height="100%" 
            />
          </div>
        </GlassPod>

        {/* Registered Students Pod */}
        <GlassPod
          title="عدد الطلاب المسجلين"
          value={stats.uniqueStudents || 2}
          icon={<UsersIcon className="w-6 h-6 text-pink-400" />}
          className="glass-card-pink"
          footer={
            <Typography variant="small" className="text-pink-400 font-bold">
              Growth: +3% (الشهر السابق)
            </Typography>
          }
        >
          <div className="relative h-20 mt-2 flex items-center justify-center overflow-hidden rounded-lg bg-black/20 border border-white/5">
            <GlobeAltIcon className="absolute w-16 h-16 text-pink-500/20 animate-pulse" />
            <div className="z-10 text-[10px] text-pink-300 text-center px-4 leading-tight">
              توزيع الطلاب العالمي (Mock Map)
              <div className="flex gap-1 justify-center mt-1">
                 <div className="w-1 h-1 rounded-full bg-pink-400 animate-ping" />
                 <div className="w-1 h-1 rounded-full bg-pink-400 animate-ping delay-75" />
                 <div className="w-1 h-1 rounded-full bg-pink-400 animate-ping delay-150" />
              </div>
            </div>
          </div>
        </GlassPod>

        {/* Exported Certificates Pod */}
        <GlassPod
          title="عدد الشهادات المصدرة"
          value={stats.totalCerts || 2}
          icon={<AcademicCapIcon className="w-6 h-6 text-blue-400" />}
          footer={
            <Typography variant="small" className="text-blue-gray-300 opacity-60">
              منذ الأسبوع الماضي
            </Typography>
          }
        >
          <div className="flex items-center gap-4 mt-2 h-20">
             <div className="w-20 h-20">
               <Chart options={donutOptions} series={[44, 55, 41, 17]} type="donut" width="100%" />
             </div>
             <div className="flex flex-col gap-1">
               <Typography className="text-[10px] text-blue-gray-400 uppercase font-bold">Type Breakdown</Typography>
               <div className="flex gap-2 items-center">
                 <div className="w-2 h-2 rounded-full bg-blue-500" />
                 <Typography className="text-[10px] text-blue-gray-900 font-bold">دورات (65%)</Typography>
               </div>
               <div className="flex gap-2 items-center">
                 <div className="w-2 h-2 rounded-full bg-green-500" />
                 <Typography className="text-[10px] text-blue-gray-900 font-bold">مشاريع (35%)</Typography>
               </div>
             </div>
          </div>
        </GlassPod>
      </div>

      {/* Complex Visualizations */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* 3D Isometric Bar Chart Section */}
        <Card className="glass-card border-none overflow-hidden">
          <CardHeader className="bg-transparent m-0 p-6 flex justify-between items-center" floated={false} shadow={false}>
             <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <ChartBarIcon className="w-5 h-5 text-blue-500" />
                </div>
                <Typography variant="h5" color="blue-gray" className="font-arabic font-bold">
                  خريطة الطلب على الدورات
                </Typography>
             </div>
             <Chip value="3D Visual" className="bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold" />
          </CardHeader>
          <CardBody className="px-6 pb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent pointer-events-none" />
            {loading ? (
              <div className="flex h-80 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              </div>
            ) : (
              <Chart 
                options={isometricChartOptions} 
                series={[{ name: "الطلب", data: courseDemand.length > 0 ? courseDemand.map(d => d.count) : [30, 40, 45, 50, 49, 60] }]} 
                type="bar" 
                height={350} 
              />
            )}
            <Typography variant="small" className="text-blue-gray-500 mt-4 leading-relaxed line-clamp-2">
              عرض إحصائي متقدم يعتمد على نموذج توزيع الطلب اللحظي للشهادات (Isometric Engine).
            </Typography>
          </CardBody>
        </Card>

        {/* Most Requested Summary Elevated */}
        <Card className="glass-card border-none">
           <CardHeader className="bg-transparent m-0 p-6" floated={false} shadow={false}>
             <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <ArrowDownTrayIcon className="w-5 h-5 text-green-500" />
                </div>
                <Typography variant="h5" color="blue-gray" className="font-arabic font-bold">
                  ملخص أكثر الدورات طلباً
                </Typography>
             </div>
          </CardHeader>
          <CardBody className="p-6">
            <div className="flex flex-col gap-5">
              {(courseDemand.length > 0 ? courseDemand : [
                { course: "دورة البرمجة", count: 120 },
                { course: "Talon Berry", count: 85 },
                { course: "تصميم واجهات", count: 64 },
                { course: "الذكاء الاصطناعي", count: 42 }
              ]).slice(0, 5).map((item, index) => (
                <div key={index} className="group relative">
                  <div className="flex items-center justify-between mb-2">
                    <Typography variant="small" className="font-bold text-blue-gray-900 font-arabic transition-all group-hover:text-blue-600">
                      {item.course}
                    </Typography>
                    <Typography className="text-xs font-bold text-blue-gray-400">
                      {item.count} شهادة
                    </Typography>
                  </div>
                  <div className="h-2 w-full bg-blue-gray-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out group-hover:brightness-110 ${
                        index === 0 ? "bg-gradient-to-r from-blue-600 to-cyan-400" : "bg-gradient-to-r from-blue-500/40 to-blue-400/20"
                      }`}
                      style={{ width: `${(item.count / 120) * 100}%` }}
                    />
                  </div>
                  <div className="absolute -inset-2 rounded-lg bg-white/0 group-hover:bg-blue-50/50 transition-colors -z-10" />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Activity in Glass Table */}
      <Card className="glass-card border-none">
        <CardHeader className="bg-transparent m-0 p-6 flex items-center gap-3" floated={false} shadow={false}>
           <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <ClockIcon className="w-5 h-5 text-indigo-500" />
           </div>
           <Typography variant="h5" color="blue-gray" className="font-arabic font-bold">
             سجل تتبع التحميلات الأخير
           </Typography>
        </CardHeader>
        <CardBody className="overflow-x-scroll px-0 pt-0 pb-2">
          <table className="w-full min-w-[640px] table-auto text-right" dir="rtl">
            <thead>
              <tr className="border-b border-blue-gray-50">
                {["رقم الشهادة", "اسم الطالب", "اسم الدورة", "تاريخ التحميل", "البيانات التقنية"].map((el) => (
                  <th key={el} className="py-4 px-6 text-right">
                    <Typography variant="small" className="text-[10px] font-bold uppercase text-blue-gray-400 font-arabic tracking-widest">
                      {el}
                    </Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-gray-50">
              {downloadLogs.slice(0, 8).map((item, key) => (
                <tr key={key} className="hover:bg-blue-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <Typography className="text-xs font-semibold text-blue-gray-600">
                      {item.certificateNumber}
                    </Typography>
                  </td>
                  <td className="py-4 px-6">
                    <Typography variant="small" color="blue-gray" className="font-bold font-arabic">
                      {item.studentName}
                    </Typography>
                  </td>
                  <td className="py-4 px-6">
                    <Typography className="text-xs font-semibold text-blue-gray-600 font-arabic">
                      {item.courseName}
                    </Typography>
                  </td>
                  <td className="py-4 px-6 text-blue-gray-400">
                    <Typography className="text-xs">
                      {new Date(item.timestamp).toLocaleString("ar-EG")}
                    </Typography>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1">
                      <Typography className="text-[10px] font-bold text-indigo-500">
                        {item.ip || "—"}
                      </Typography>
                      <Typography className="text-[10px] text-blue-gray-400 truncate max-w-[120px]">
                        {item.userAgent || "—"}
                      </Typography>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

export default Home;
