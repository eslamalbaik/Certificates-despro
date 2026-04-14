import React, { useEffect, useState } from "react";
import {
  Typography,
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
  Chip,
} from "@material-tailwind/react";
import Chart from "react-apexcharts";
import api from "@/configs/api";
import { ClockIcon, ChartBarIcon, ArrowDownTrayIcon } from "@heroicons/react/24/solid";

export default function Analytics() {
  const [courseDemand, setCourseDemand] = useState([]);
  const [downloadLogs, setDownloadLogs] = useState([]);
  const [stats, setStats] = useState({ totalCerts: 0, uniqueStudents: 0, totalDownloads: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [demandRes, logsRes, statsRes] = await Promise.all([
          api.get("/certificates/stats/course-demand"),
          api.get("/certificates/stats/download-logs"),
          api.get("/certificates/stats")
        ]);
        setCourseDemand(demandRes.data);
        setDownloadLogs(logsRes.data);
        setStats(statsRes.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const chartOptions = {
    chart: {
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '70%',
        distributed: true,
        borderRadius: 4,
      }
    },
    colors: ["#1C1CB0", "#008FFB", "#00E396", "#FEB019", "#FF4560", "#775DD0"],
    dataLabels: { enabled: true },
    xaxis: {
      categories: courseDemand.map(d => d.course),
      labels: {
        style: {
          colors: "#616161",
          fontSize: "12px",
          fontWeight: 400,
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#616161",
          fontSize: "12px",
          fontWeight: 400,
        },
      },
    },
    grid: {
      show: true,
      borderColor: "#dddddd",
      strokeDashArray: 5,
      xaxis: { lines: { show: true } },
      padding: { top: 5, right: 20 },
    },
    fill: { opacity: 0.8 },
    tooltip: { theme: "dark" },
  };

  const chartSeries = [{
    name: "عدد الشهادات",
    data: courseDemand.map(d => d.count)
  }];

  return (
    <div className="mt-12 mb-8 flex flex-col gap-12 font-arabic">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Course Demand Chart */}
        <Card className="border border-blue-gray-100 shadow-sm">
          <CardHeader variant="gradient" color="blue" floated={false} shadow={false} className="p-4">
             <div className="flex items-center gap-2">
                <ChartBarIcon className="w-6 h-6 text-white" />
                <Typography variant="h6" color="white" className="font-arabic">
                  خريطة الطلب على الدورات
                </Typography>
             </div>
          </CardHeader>
          <CardBody className="px-6 pt-0">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              </div>
            ) : courseDemand.length > 0 ? (
              <Chart options={chartOptions} series={chartSeries} type="bar" height={350} />
            ) : (
              <div className="flex h-64 items-center justify-center text-gray-500">
                لا توجد بيانات متاحة حالياً
              </div>
            )}
            <Typography variant="small" className="font-normal text-blue-gray-600 mt-4">
              يوضح هذا المخطط أكثر الدورات طلباً للشهادات بناءً على عدد الشهادات المصدرة.
            </Typography>
          </CardBody>
        </Card>

        {/* Summary Table or Info */}
        <Card className="border border-blue-gray-100 shadow-sm">
           <CardHeader variant="gradient" color="green" floated={false} shadow={false} className="p-4">
             <div className="flex items-center gap-2">
                <ArrowDownTrayIcon className="w-6 h-6 text-white" />
                <Typography variant="h6" color="white" className="font-arabic">
                  ملخص الإحصائيات
                </Typography>
             </div>
          </CardHeader>
          <CardBody className="p-6">
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col items-center">
                    <Typography variant="small" className="text-blue-gray-600 font-arabic">إجمالي الشهادات</Typography>
                    <Typography variant="h4" className="text-blue-700">{stats.totalCerts}</Typography>
                 </div>
                 <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col items-center">
                    <Typography variant="small" className="text-blue-gray-600 font-arabic">إجمالي التحميلات</Typography>
                    <Typography variant="h4" className="text-green-700">{stats.totalDownloads}</Typography>
                 </div>
              </div>
              <div className="flex flex-col gap-4">
                <Typography variant="small" className="font-bold text-blue-gray-400 font-arabic px-1">الأكثر طلباً:</Typography>
                {courseDemand.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-2">
                    <Typography variant="small" className="font-bold text-blue-gray-900 truncate flex-1">
                      {item.course}
                    </Typography>
                    <Chip
                      variant="ghost"
                      color={index === 0 ? "green" : "blue"}
                      value={`${item.count} شهادة`}
                      className="rounded-full"
                    />
                  </div>
                ))}
                {courseDemand.length === 0 && <Typography className="text-center text-gray-500">لا توجد بيانات</Typography>}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Download Tracking Logs */}
      <Card className="border border-blue-gray-100 shadow-sm">
        <CardHeader variant="gradient" color="indigo" floated={false} shadow={false} className="p-4">
           <div className="flex items-center gap-2">
              <ClockIcon className="w-6 h-6 text-white" />
               <Typography variant="h6" color="white" className="font-arabic">
                 سجل تتبع التحميلات (آخر 100 عملية)
               </Typography>
           </div>
        </CardHeader>
        <CardBody className="overflow-x-scroll px-0 pt-0 pb-2">
          <table className="w-full min-w-[640px] table-auto text-right">
            <thead>
              <tr>
                {["رقم الشهادة", "اسم الطالب", "اسم الدورة", "تاريخ التحميل", "IP / الجهاز"].map((el) => (
                  <th
                    key={el}
                    className="border-b border-blue-gray-50 py-3 px-5 text-right"
                  >
                    <Typography
                      variant="small"
                      className="text-[11px] font-bold uppercase text-blue-gray-400"
                    >
                      {el}
                    </Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center">
                    <div className="flex justify-center">
                       <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : downloadLogs.length > 0 ? (
                downloadLogs.map((item, key) => {
                  const { certificateNumber, studentName, courseName, timestamp } = item;
                  const className = `py-3 px-5 ${
                    key === downloadLogs.length - 1 ? "" : "border-b border-blue-gray-50"
                  }`;

                  return (
                    <tr key={key}>
                      <td className={className}>
                        <Typography className="text-xs font-semibold text-blue-gray-600">
                          {certificateNumber}
                        </Typography>
                      </td>
                      <td className={className}>
                        <Typography variant="small" color="blue-gray" className="font-bold">
                          {studentName}
                        </Typography>
                      </td>
                      <td className={className}>
                        <Typography className="text-xs font-semibold text-blue-gray-600">
                          {courseName}
                        </Typography>
                      </td>
                      <td className={className}>
                        <Typography className="text-xs font-semibold text-blue-gray-600">
                          {new Date(timestamp).toLocaleString("ar-EG")}
                        </Typography>
                      </td>
                      <td className={className}>
                        <div className="flex flex-col gap-0.5">
                          <Typography className="text-[10px] font-bold text-indigo-600">
                            {item.ip || "—"}
                          </Typography>
                          <Typography className="text-[10px] text-blue-gray-400 truncate max-w-[150px]" title={item.userAgent}>
                            {item.userAgent || "—"}
                          </Typography>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-gray-500">
                    لا يوجد سجل تحميلات حتى الآن
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
