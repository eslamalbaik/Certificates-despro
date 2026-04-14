import React, { useMemo, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Typography,
  Button,
  Input,
  Avatar,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  IconButton,
} from "@material-tailwind/react";
import {
  EyeIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";
import api from "@/configs/api";

const LinkedInIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5"
  >
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.25 6.5 1.75 1.75 0 016.5 8.25zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.4 3.85V19z" />
  </svg>
);

export default function StudentsInterface() {
  const [studentId, setStudentId] = useState("");
  const [certificates, setCertificates] = useState([]);
  const [viewMode, setViewMode] = useState("cards");
  const [openDisclaimer, setOpenDisclaimer] = useState(false);
  const [selectedAction, setSelectedAction] = useState({ type: "", url: "", certId: "" });
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  function resolveCertificateUrl(cert) {
    // يختار رابط الشهادة من الحقول المتاحة (Cloudinary)
    return (
      cert?.pdfUrl ||
      cert?.certificateUrl ||
      cert?.url ||
      ""
    );
  }
  const handleSearch = async () => {
    const idTrim = studentId.trim();
    if (!idTrim) return;

    setHasSearched(true);
    setIsLoading(true);
    setCertificates([]);

    try {
      // تحقق من الشهادة عبر رقم الشهادة
      const { data } = await api.get("/certificates/verify", {
        params: { certificate: idTrim },
      });
      if (data?.valid && data?.certificate) {
        setCertificates([data.certificate]);
      } else {
        setCertificates([]);
      }
    } catch (err) {
      console.error("Error verifying certificate:", err);
      setCertificates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateLinkedInUrl = (cert) => {
    const baseUrl = "https://www.linkedin.com/profile/add";
    const certName = encodeURIComponent(cert.courseName || "شهادة إتمام دورة");
    const orgName = encodeURIComponent("المصمم المحترف");
    const certNumber = encodeURIComponent(cert.certificateNumber || "");
    const certUrl = encodeURIComponent(resolveCertificateUrl(cert));
    
    // Extract date
    const date = cert.createdAt ? new Date(cert.createdAt) : new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12

    return `${baseUrl}?startTask=CERTIFICATION_NAME&name=${certName}&organizationName=${orgName}&issueYear=${year}&issueMonth=${month}&certUrl=${certUrl}&certId=${certNumber}`;
  };

  function getDownloadUrl(certificateUrl) {
    if (!certificateUrl) return "";
    // إدراج fl_attachment لرابط Cloudinary فقط
    return certificateUrl.includes("/upload/")
      ? certificateUrl.replace("/upload/", "/upload/fl_attachment/")
      : certificateUrl;
  }

function triggerDownload(certificateUrl, filename = "certificate.pdf") {
  const finalUrl = getDownloadUrl(certificateUrl);
  if (!finalUrl) return;
  const link = document.createElement("a");
  link.href = finalUrl;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

  const handleCertificateAction = (type, url, certId) => {
    if (!url) return;
    setSelectedAction({ type, url, certId });
    setOpenDisclaimer(true);
  };

  const statusCard = useMemo(() => {
    if (!hasSearched) return null;
    if (isLoading) {
      return (
        <Card className="mb-4 border border-blue-200 bg-blue-50/70">
          <CardBody className="flex items-center justify-between gap-4 font-arabic">
            <Typography className="text-blue-700" style={{ fontWeight: 500, fontStyle: 'normal' }}>جاري التحقق من الشهادة...</Typography>
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </CardBody>
        </Card>
      );
    }

    if (certificates.length === 1) {
      const cert = certificates[0];
      return (
        <Card className="mb-4 border border-green-200 bg-green-50/70 shadow-sm">
          <CardBody className="grid gap-3 md:grid-cols-4 font-arabic text-right">
            <div className="md:col-span-4 flex flex-col items-center gap-2 text-center">
              <img
                src="/img/ver12.webp"
                alt="تم التحقق"
                className="w-16 h-16"
              />
              <Typography
                variant="h4"
                className="text-green-700 my-2"
                style={{ fontFamily: '"Readex Pro", sans-serif', fontWeight: 500, fontStyle: 'normal' }}
              >
                تم التحقق من الشهادة بنجاح
              </Typography>
            </div>
            <div className="bg-white/80 rounded-lg p-3 border border-green-100">
              <Typography color="gray" className="text-sm"                 style={{ fontFamily: '"Readex Pro", sans-serif', fontWeight: 500, fontStyle: 'normal' }}
              >
                رقم الشهادة
              </Typography>
              <Typography className="font-semibold text-blue-gray-900"                 style={{ fontFamily: '"Readex Pro", sans-serif', fontWeight: 500, fontStyle: 'normal' }}
              >
                {cert.certificateNumber || studentId}
              </Typography>
            </div>
            <div className="bg-white/80 rounded-lg p-3 border border-green-100"                 style={{ fontFamily: '"Readex Pro", sans-serif', fontWeight: 500, fontStyle: 'normal' }}
            >
              <Typography color="gray" className="text-sm"                 style={{ fontFamily: '"Readex Pro", sans-serif', fontWeight: 500, fontStyle: 'normal' }}
              >
                اسم المتدرب
              </Typography>
              <Typography className="font-semibold text-blue-gray-900"                 style={{ fontFamily: '"Readex Pro", sans-serif', fontWeight: 500, fontStyle: 'normal' }}
              >
                {cert.studentName || cert.traineeName || "—"}
              </Typography>
            </div>
            <div className="bg-white/80 rounded-lg p-3 border border-green-100">
              <Typography color="gray" className="text-sm"                 style={{ fontFamily: '"Readex Pro", sans-serif', fontWeight: 500, fontStyle: 'normal' }}
              >
                اسم الدورة
              </Typography>
              <Typography className="font-semibold text-blue-gray-900"                 style={{ fontFamily: '"Readex Pro", sans-serif', fontWeight: 500, fontStyle: 'normal' }}
              >
                {cert.courseName || "—"}
              </Typography>
            </div>
            <div className="bg-white/80 rounded-lg p-3 border border-green-100">
              <Typography color="gray" className="text-sm"                 style={{ fontFamily: '"Readex Pro", sans-serif', fontWeight: 500, fontStyle: 'normal' }}
              >
                اسم المدرب
              </Typography>
              <Typography className="font-semibold text-blue-gray-900"                 style={{ fontFamily: '"Readex Pro", sans-serif', fontWeight: 500, fontStyle: 'normal' }}
              >
                {cert.trainerName || "—"}
              </Typography>
            </div>
          </CardBody>
        </Card>
      );
    }

    if (certificates.length === 0 && studentId.trim()) {
      return (
        <Card className="mb-4 border border-red-200 bg-red-50/70">
          <CardBody className="font-arabic text-right text-red-600" style={{ fontWeight: 500, fontStyle: 'normal' }}>
            لم يتم العثور على شهادة بهذا الرقم. تأكد من صحة الرقم وحاول مرة أخرى.
          </CardBody>
        </Card>
      );
    }

    return null;
  }, [hasSearched, isLoading, certificates, studentId]);

  const proceedWithAction = async () => {
    if (!selectedAction.url) {
      setOpenDisclaimer(false);
      return;
    }

    // تتبع التحميل/المشاهدة
    if (selectedAction.certId) {
      try {
        await api.post(`/certificates/${selectedAction.certId}/track-download`);
      } catch (err) {
        console.error("Failed to track action:", err);
      }
    }

    if (selectedAction.type === "download") {
      triggerDownload(selectedAction.url, `certificate-${selectedAction.certId || 'download'}.pdf`);
    } else {
      window.open(selectedAction.url, "_blank");
    }
    
    setOpenDisclaimer(false);
  };

  return (
    <>
      {/* Header with Logo & Title */}
      <div className="relative h-72 w-full n rounded-xl bg-cover bg-center mt-48">
        <div className="absolute inset-0 bg-white-900/75" />
        <div className="absolute inset-0 mb-32 flex flex-col justify-center items-center text-center p-4">
          <img src="/img/logopro.jpg" className="w-40 h-40 lg:w-64 lg:h-64 -mb-12" alt="Logo" />
          <Typography variant="h5" className="mt-4 text-white font-arabic" style={{ fontWeight: 500, fontStyle: 'normal' }}>
            المصمم المحترف
          </Typography>
        </div>
      </div>

      {/* Search Interface */}
      <Card className="mx-4 -mt-20 mb-8 border border-blue-gray-100 shadow min-h-[600px]">
        <CardHeader className="p-6 text-right">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <Avatar src="/img/certificate.png" size="xl" variant="rounded" />
              <div>
                <Typography variant="h3" className="font-arabic text-[#1C1CB0]" style={{ fontWeight: 500, fontStyle: 'normal' }}>
                  منصة استلام الشهادات
                </Typography>
                <Typography
                  variant="small"
                  className="text-blue-gray-300 font-arabic"
                  style={{ fontWeight: 500, fontStyle: 'normal' }}
                >
                  ابحث عن شهادتك باستخدام رقم الشهادة
                </Typography>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-col md:flex-row">
              <Input
                label="ادخل رقم الشهادة هنا"
                value={studentId}
                onChange={(e) => {
                          setStudentId(e.target.value);
                        }}
                className="font-arabic"
              />
              <Button
                onClick={handleSearch}
                className="font-arabic min-w-[140px] px-4 py-2 bg-[#1C1CB0] text-white flex items-center justify-center gap-2"
                style={{ fontWeight: 500, fontStyle: 'normal' }}
              >
                <MagnifyingGlassIcon className="h-5 w-5 text-white" />
                بحث
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* <Typography className="font-arabic text-center text-red-500 mt-8 text-lg font-bold">
          الاحتفاظ بالشهادة مسئولية المتدرب ولا يوجد لدينا ارشيف.
        </Typography> */}

        <CardBody className="p-6">
          {statusCard}

          {/* تبديل العرض عند وجود نتائج متعددة (احتياطيًا) */}
          {certificates.length > 1 && (
            <div className="flex items-center justify-end mb-4 space-x-2">
              <Button
                size="sm"
                className={`font-arabic ${
                  viewMode === "cards"
                    ? "bg-[##1C1CB0] text-white"
                    : "bg-gray-400"
                }`}
                onClick={() => setViewMode("cards")}
                style={{ fontWeight: 500, fontStyle: 'normal' }}
              >
                عرض بطاقات
              </Button>
              <Button
                size="sm"
                className={`font-arabic ${
                  viewMode === "table"
                    ? "bg-[##1C1CB0] text-white"
                    : "bg-gray-400"
                }`}
                onClick={() => setViewMode("table")}
                style={{ fontWeight: 500, fontStyle: 'normal' }}
              >
                عرض جدول
              </Button>
            </div>
          )}

          {/* Prompt / No results */}
          {!hasSearched && (
            <Typography className="font-arabic text-center text-gray-500" style={{ fontWeight: 500, fontStyle: 'normal' }}>
              أدخل رقم الشهادة للبدء في التحقق.
            </Typography>
          )}

          {/* Cards View */}
          {certificates.length > 0 && viewMode === "cards" && (
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
             {certificates.map((cert, idx) => (
                <Card key={cert._id || idx} className="hover:shadow-lg transition-shadow">
                  <CardBody className="flex flex-col items-stretch p-5 gap-4">
                    <div className="flex justify-between items-start">
                      <Typography variant="small" className="text-gray-500 font-arabic" style={{ fontWeight: 500, fontStyle: 'normal' }}>
                        {cert.createdAt
                          ? new Date(cert.createdAt).toLocaleDateString("ar-EG")
                          : "—"}
                      </Typography>
                      <Typography
                        variant="small"
                        className="bg-blue-100 text-[##1C1CB0] px-2 py-1 rounded-full"
                        style={{ fontWeight: 500, fontStyle: 'normal' }}
                      >
                        شهادة #{idx + 1}
                      </Typography>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <DocumentTextIcon className="h-14 w-14 text-blue-500" />
                      <Typography variant="h6" className="font-arabic text-blue-gray-900" style={{ fontWeight: 500, fontStyle: 'normal' }}>
                        {cert.studentName || cert.traineeName || "—"}
                      </Typography>
                    </div>
                    <div className="bg-blue-gray-50/60 border border-blue-gray-100 rounded-xl p-4 text-right font-arabic" style={{ fontWeight: 500, fontStyle: 'normal' }}>
                      <div className="text-sm text-blue-gray-600" style={{ fontWeight: 500 }}>اسم الدورة</div>
                      <div className="font-semibold text-blue-gray-900" style={{ fontWeight: 500 }}>
                        {cert.courseName || "—"}
                      </div>
                      {cert.trainerName && (
                        <div className="mt-3">
                          <div className="text-sm text-blue-gray-600" style={{ fontWeight: 500 }}>اسم المدرب</div>
                          <div className="font-semibold text-blue-gray-900" style={{ fontWeight: 500 }}>
                            {cert.trainerName}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center gap-4 w-full mt-auto">
                      <IconButton
                        color="blue"
                        variant="text"
                        onClick={() =>
                          handleCertificateAction("view", resolveCertificateUrl(cert), cert._id || cert.id)
                        }
                      >
                        <EyeIcon className="h-5 w-5" />
                      </IconButton>

                      <IconButton
                        color="green"
                        variant="text"
                        onClick={() =>
                          handleCertificateAction("download", resolveCertificateUrl(cert), cert._id || cert.id)
                        }
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                      </IconButton>

                      <IconButton
                        color="blue"
                        variant="text"
                        onClick={() => window.open(generateLinkedInUrl(cert), "_blank")}
                        title="Add to LinkedIn"
                      >
                        <LinkedInIcon />
                      </IconButton>
                    </div>
                  </CardBody>
                </Card>
              ))}

            </div>
          )}

          {/* Table View */}
          {certificates.length > 0 && viewMode === "table" && (
            <table className="min-w-full table-auto text-right font-arabic" style={{ fontWeight: 500, fontStyle: 'normal' }}>
              <thead>
                <tr>
                  <th className="px-4 py-2" style={{ fontWeight: 500, fontStyle: 'normal' }}>الشهادة</th>
                  <th className="px-4 py-2" style={{ fontWeight: 500, fontStyle: 'normal' }}>التاريخ</th>
                  <th className="px-4 py-2" style={{ fontWeight: 500, fontStyle: 'normal' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert, idx) => (
                  <tr key={cert._id} className="border-t">
                    <td className="px-4 py-2 font-arabic" style={{ fontWeight: 500, fontStyle: 'normal' }}>شهادة {idx + 1}</td>
                    <td className="px-4 py-2" style={{ fontWeight: 500, fontStyle: 'normal' }}>
                      {new Date(cert.createdAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center space-x-4">
                        <IconButton
                          onClick={() =>
                            handleCertificateAction("view", resolveCertificateUrl(cert), cert._id || cert.id)
                          }
                          className="h-6 w-6 text-blue-gray-500 hover:text-blue-700 bg-white"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </IconButton>
                        <IconButton
                          onClick={() =>
                            handleCertificateAction("download", resolveCertificateUrl(cert), cert._id || cert.id)
                          }
                          className="h-6 w-6 text-green-500 hover:text-green-700 bg-white"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </IconButton>
                        <IconButton
                          onClick={() => window.open(generateLinkedInUrl(cert), "_blank")}
                          className="h-6 w-6 text-blue-600 hover:text-blue-800 bg-white"
                          title="Add to LinkedIn"
                        >
                          <LinkedInIcon />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Disclaimer Dialog */}
      <Dialog open={openDisclaimer} handler={() => setOpenDisclaimer(false)}>
        <DialogHeader className="font-arabic" style={{ fontWeight: 500, fontStyle: 'normal' }}>تنبيه هام</DialogHeader>
        <DialogBody divider className="font-arabic text-right" style={{ fontWeight: 500, fontStyle: 'normal' }}>
          <Typography variant="h5" className="text-red-500 mb-4" style={{ fontWeight: 500, fontStyle: 'normal' }}>
            الاحتفاظ بالشهادة مسئولية المتدرب
          </Typography>
          <Typography variant="paragraph" style={{ fontWeight: 500, fontStyle: 'normal' }}>
            يرجى العلم أنه لا يوجد لدينا أرشيف للشهادات، وعليك تحميل وحفظ جميع
            الشهادات الخاصة بك. لن نكون مسؤولين عن أي شهادات مفقودة في حالة عدم
            قيامك بحفظها.
          </Typography>
        </DialogBody>
        <DialogFooter>
            <Button
              variant="text"
              onClick={() => setOpenDisclaimer(false)}
              className="font-arabic mr-2"
              style={{ fontWeight: 500, fontStyle: 'normal' }}
            >
              إلغاء
            </Button>
            <Button
              color="blue"
              onClick={proceedWithAction}
              className="font-arabic"
              style={{ fontWeight: 500, fontStyle: 'normal' }}
            >
              {selectedAction.type === "view" ? "مشاهدة الشهادة" : "تحميل الشهادة"}
            </Button>
        </DialogFooter>
      </Dialog>

      <footer className="py-2">
        <div className="text-center">
            <Typography
            variant="small"
            className="font-normal text-inherit text-center font-arabic"
            style={{ fontWeight: 500, fontStyle: 'normal' }}
          >
            المصمم المحترف &copy; 2025
          </Typography>
        </div>
      </footer>
    </>
  );
}
