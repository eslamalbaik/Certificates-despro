// src/pages/AllCertificates.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Card, CardHeader, CardBody,
  Typography, Input, Button, IconButton,
  Dialog, DialogHeader, DialogBody, DialogFooter,
  Chip,
} from "@material-tailwind/react";
import {
  MagnifyingGlassIcon, EyeIcon, ArrowDownTrayIcon,
  TrashIcon, DocumentTextIcon, XMarkIcon,
  DocumentArrowDownIcon, ClockIcon,
} from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";
import Upload from "@/widgets/Upload";
import api from "@/configs/api";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

// Material-UI imports
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Checkbox from "@mui/material/Checkbox";

export default function AllCertificates() {
  const [groups, setGroups] = useState([]);
  const [filter, setFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [certResult, setCertResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState("view");
  const [deletingStud, setDeletingStud] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedGroupKeys, setSelectedGroupKeys] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historicalCert, setHistoricalCert] = useState(null);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  useEffect(() => {
    fetchCertificates();
  }, [pagination.page, pagination.limit]);

  const fetchCertificates = async () => {
    setLoading(true);
    let mappedGroups = [];
    try {
      const { data } = await api.get(
        `/certificates?page=${pagination.page}&limit=${pagination.limit}`
      );

      const allCerts = data.data || [];
      const map = new Map();
      allCerts.forEach((c) => {
        const key = c.studentId || c.certificateNumber || c._id;
        if (!map.has(key)) {
          map.set(key, {
            groupKey: key,
            studentId: c.studentId || null,
            displayId: c.studentId || c.certificateNumber || c._id,
            studentName: c.studentName || c.traineeName || null,
            certificates: [],
          });
        }
        // تحديث اسم الطالب من آخر شهادة إذا كان غير موجود
        if (!map.get(key).studentName && (c.studentName || c.traineeName)) {
          map.get(key).studentName = c.studentName || c.traineeName;
        }
        map.get(key).certificates.push(c);
      });

      mappedGroups = Array.from(map.values()).map((entry) => ({
        ...entry,
        certCount: entry.certificates.length,
        totalDownloads: entry.certificates.reduce((sum, c) => sum + (c.downloadCount || 0), 0),
      }));

      setGroups(mappedGroups);
      setSelected((prev) =>
        prev
          ? mappedGroups.find((g) => g.groupKey === prev.groupKey) || prev
          : prev
      );
      setSelectedGroupKeys((prev) =>
        prev.filter((key) => mappedGroups.some((g) => g.groupKey === key))
      );

      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }));
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch certificates");
    } finally {
      setLoading(false);
    }
    return mappedGroups;
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const filtered = useMemo(
    () => {
      if (filter || nameFilter) {
        const searchTerm = filter.trim().toLowerCase();
        const nameSearchTerm = nameFilter.trim().toLowerCase();
        return groups.filter((g) => {
          const displayIdMatch = searchTerm ? (g.displayId || "").toString().toLowerCase().includes(searchTerm) : true;
          const nameMatch = nameSearchTerm ? (g.studentName || "").toLowerCase().includes(nameSearchTerm) : true;
          return displayIdMatch && nameMatch;
        });
      }
      return groups;
    },
    [groups, filter, nameFilter]
  );

  useEffect(() => {
    setSelectedGroupKeys((prev) =>
      prev.filter((key) => filtered.some((g) => g.groupKey === key))
    );
  }, [filtered]);

  const isAllSelected =
    filtered.length > 0 &&
    filtered.every((g) => selectedGroupKeys.includes(g.groupKey));

  const toggleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedGroupKeys(filtered.map((g) => g.groupKey));
    } else {
      setSelectedGroupKeys([]);
    }
  };

  const toggleSelectStudent = (groupKey) => {
    setSelectedGroupKeys((prev) =>
      prev.includes(groupKey)
        ? prev.filter((key) => key !== groupKey)
        : [...prev, groupKey]
    );
  };

  const openDialogFor = (group, initialMode) => {
    setSelected(group);
    setMode(initialMode);
    setOpenDialog(true);
  };

  const handleSearchByName = async () => {
    const searchName = nameFilter.trim();
    if (!searchName) return;

    // البحث في البيانات المحملة أولاً بالاسم
    const matchingGroups = groups.filter(
      (g) => (g.studentName || "").toLowerCase().includes(searchName.toLowerCase())
    );

      if (matchingGroups.length > 0) {
        if (matchingGroups.length === 1) {
          openDialogFor(matchingGroups[0], "view");
          toast.success(`تم العثور على طالب: ${matchingGroups[0].studentName}`);
        } else {
          // إذا كان هناك أكثر من طالب، فلنفتح أول واحد ونظهر رسالة
          openDialogFor(matchingGroups[0], "view");
          toast.success(`تم العثور على ${matchingGroups.length} طالب، يعرض الأول`);
          // تصفية القائمة لإظهار المطابقين فقط
          // الـ nameFilter موجود بالفعل لذلك التصفية ستحدث تلقائياً
        }
        return;
      }

    // إذا لم يتم العثور محلياً، البحث في جميع الصفحات
    toast.info("جارٍ البحث في جميع البيانات...");
    
    // محاولة البحث عبر جميع الصفحات
    try {
      let allFoundCerts = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore && currentPage <= 10) { // حد أقصى 10 صفحات
        try {
          const { data } = await api.get(`/certificates?page=${currentPage}&limit=100`);
          const pageCerts = data.data || [];
          
          const matching = pageCerts.filter((c) => 
            (c.studentName || c.traineeName || "").toLowerCase().includes(searchName.toLowerCase())
          );
          
          if (matching.length > 0) {
            allFoundCerts = [...allFoundCerts, ...matching];
          }

          if (pageCerts.length < 100 || currentPage >= data.pagination?.totalPages) {
            hasMore = false;
          } else {
            currentPage++;
          }
        } catch (e) {
          hasMore = false;
        }
      }

      if (allFoundCerts.length > 0) {
        // تجميع الشهادات حسب studentId
        const map = new Map();
        allFoundCerts.forEach((c) => {
          const key = c.studentId || c.certificateNumber || c._id;
          if (!map.has(key)) {
            map.set(key, {
              groupKey: key,
              studentId: c.studentId || null,
              displayId: c.studentId || c.certificateNumber || c._id,
              studentName: c.studentName || c.traineeName || null,
              certificates: [],
            });
          }
          if (!map.get(key).studentName && (c.studentName || c.traineeName)) {
            map.get(key).studentName = c.studentName || c.traineeName;
          }
          map.get(key).certificates.push(c);
        });

        const foundGroups = Array.from(map.values()).map((entry) => ({
          ...entry,
          certCount: entry.certificates.length,
        }));

        // إضافة المجموعات الجديدة إلى القائمة
        setGroups(prev => {
          const existingKeys = new Set(prev.map(g => g.groupKey));
          const newGroups = foundGroups.filter(g => !existingKeys.has(g.groupKey));
          return [...newGroups, ...prev];
        });

        if (foundGroups.length > 0) {
          openDialogFor(foundGroups[0], "view");
          toast.success(`تم العثور على ${foundGroups.length} طالب، يعرض الأول`);
        }
      } else {
        toast.error("لم يتم العثور على طالب بهذا الاسم");
      }
    } catch (err) {
      console.error(err);
      toast.error("تعذر البحث بالاسم");
    }
  };

  const handleSearchStudent = async () => {
    const searchTerm = filter.trim();
    if (!searchTerm) return;

    // البحث في البيانات المحملة أولاً
    const localGroup = groups.find(
      (g) => (g.displayId || "").toString() === searchTerm
    );

    if (localGroup) {
      openDialogFor(localGroup, "view");
      return;
    }

    // إذا لم يتم العثور محلياً، البحث في API
    try {
      const { data } = await api.get("/certificates/search", {
        params: { studentId: searchTerm },
      });

      if (data && Array.isArray(data) && data.length > 0) {
        // تجميع الشهادات حسب studentId
        const map = new Map();
        data.forEach((c) => {
          const key = c.studentId || c.certificateNumber || c._id;
          if (!map.has(key)) {
            map.set(key, {
              groupKey: key,
              studentId: c.studentId || null,
              displayId: c.studentId || c.certificateNumber || c._id,
              studentName: c.studentName || c.traineeName || null,
              certificates: [],
            });
          }
          if (!map.get(key).studentName && (c.studentName || c.traineeName)) {
            map.get(key).studentName = c.studentName || c.traineeName;
          }
          map.get(key).certificates.push(c);
        });

        const foundGroups = Array.from(map.values()).map((entry) => ({
          ...entry,
          certCount: entry.certificates.length,
        }));

        // إضافة المجموعات الجديدة إلى القائمة
        setGroups(prev => {
          const existingKeys = new Set(prev.map(g => g.groupKey));
          const newGroups = foundGroups.filter(g => !existingKeys.has(g.groupKey));
          return [...newGroups, ...prev];
        });

        // فتح أول مجموعة وجدت
        if (foundGroups.length > 0) {
          openDialogFor(foundGroups[0], "view");
          toast.success(`تم العثور على ${foundGroups[0].certCount} شهادة`);
        }
      } else {
        // محاولة البحث برقم الشهادة إذا لم يتم العثور على طالب
        try {
          const { data: certData } = await api.get('/certificates/verify', { 
            params: { certificate: searchTerm } 
          });
          if (certData?.valid && certData?.certificate) {
            const cert = certData.certificate;
            setCertResult(cert);
            
            // إضافة الشهادة إلى القائمة
            const key = cert.studentId || cert.certificateNumber || cert._id;
            const existingGroup = groups.find(g => g.groupKey === key || g.certificates.some(c => c._id === cert._id || c.certificateNumber === cert.certificateNumber));
            
            if (!existingGroup) {
              const newGroup = {
                groupKey: key,
                studentId: cert.studentId || null,
                displayId: cert.studentId || cert.certificateNumber || cert._id,
                studentName: cert.studentName || cert.traineeName || null,
                certificates: [cert],
                certCount: 1,
              };
              setGroups(prev => [newGroup, ...prev]);
              openDialogFor(newGroup, "view");
              toast.success('تم العثور على الشهادة');
            } else {
              openDialogFor(existingGroup, "view");
              toast.success('تم العثور على الشهادة');
            }
            return;
          }
        } catch (e) {
          // تجاهل خطأ البحث برقم الشهادة
        }
        toast.error("لم يتم العثور على طالب أو شهادة بهذا المعرف");
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || "تعذر البحث عن الطالب";
      toast.error(errorMsg);
    }
  };

  const searchByCertificateNumber = async (certNumber) => {
    const num = certNumber || filter.trim();
    if (!num) return;
    try {
      const { data } = await api.get('/certificates/verify', { params: { certificate: num } });
      if (data?.valid && data?.certificate) {
        const cert = data.certificate;
        setCertResult(cert);
        
        // إضافة الشهادة إلى القائمة إذا لم تكن موجودة
        const key = cert.studentId || cert.certificateNumber || cert._id;
        const existingGroup = groups.find(g => g.groupKey === key || g.certificates.some(c => c._id === cert._id || c.certificateNumber === cert.certificateNumber));
        
        if (!existingGroup) {
          // إنشاء مجموعة جديدة وإضافتها
          const newGroup = {
            groupKey: key,
            studentId: cert.studentId || null,
            displayId: cert.studentId || cert.certificateNumber || cert._id,
            studentName: cert.studentName || cert.traineeName || null,
            certificates: [cert],
            certCount: 1,
          };
          setGroups(prev => [newGroup, ...prev]);
          openDialogFor(newGroup, "view");
          toast.success('تم العثور على الشهادة وإضافتها إلى القائمة');
        } else {
          // التحقق من وجود الشهادة في المجموعة
          const certExists = existingGroup.certificates.some(c => c._id === cert._id || c.certificateNumber === cert.certificateNumber);
          if (!certExists) {
            // إضافة الشهادة إلى المجموعة الموجودة
            const updatedGroups = groups.map(g => 
              g.groupKey === existingGroup.groupKey
                ? {
                    ...g,
                    certificates: [...g.certificates, cert],
                    certCount: g.certCount + 1,
                  }
                : g
            );
            setGroups(updatedGroups);
            // تحديث المجموعة المحددة
            const updatedGroup = updatedGroups.find(g => g.groupKey === existingGroup.groupKey);
            if (updatedGroup) {
              openDialogFor(updatedGroup, "view");
            }
            toast.success('تم العثور على الشهادة وإضافتها إلى القائمة');
          } else {
            openDialogFor(existingGroup, "view");
            toast.success('تم العثور على الشهادة');
          }
        }
      } else {
        setCertResult(null);
        toast.error('لم يتم العثور على شهادة بهذا الرقم');
      }
    } catch (err) {
      console.error(err);
      setCertResult(null);
      const errorMsg = err.response?.data?.message || 'تعذر البحث عن الشهادة';
      toast.error(errorMsg);
    }
  };

  const deleteGroupOnServer = async (group) => {
    const { studentId, certificates } = group || {};

    if (studentId) {
      await api.delete(`/certificates/student/${studentId}`);
      return { success: true };
    }

    if (!certificates?.length) {
      return { success: false, message: "لا توجد شهادات مرتبطة بهذا السجل" };
    }

    const results = await Promise.allSettled(
      certificates.map((cert) => api.delete(`/certificates/${cert._id}`))
    );

    const failedCount = results.filter((r) => r.status === "rejected").length;

    if (failedCount > 0) {
      return {
        success: false,
        message: `تعذر حذف ${failedCount} شهادة مرتبطة بهذا الطالب`,
      };
    }

    return { success: true };
  };

  const handleDeleteStudent = async (group) => {
    if (!group) return;
    if (!window.confirm("هل أنت متأكد من حذف هذا الطالب وكل شهاداته؟")) return;
    setDeletingStud(true);
    try {
      const result = await deleteGroupOnServer(group);
      if (!result.success) {
        toast.error(result.message || "تعذر حذف الطالب، حاول لاحقًا");
        return;
      }

      setGroups((prev) => prev.filter((g) => g.groupKey !== group.groupKey));
      setSelectedGroupKeys((prev) =>
        prev.filter((key) => key !== group.groupKey)
      );
      if (selected?.groupKey === group.groupKey) {
        setOpenDialog(false);
        setSelected(null);
      }
      toast.success("تم حذف الطالب بنجاح");
      fetchCertificates();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء حذف الطالب");
    } finally {
      setDeletingStud(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedGroupKeys.length === 0) return;
    if (!window.confirm("هل تريد حذف كل الطلاب المحددين وشهاداتهم؟")) return;

    setBulkDeleting(true);
    const keysToDelete = [...selectedGroupKeys];
    const groupsToDelete = keysToDelete
      .map((key) => groups.find((g) => g.groupKey === key))
      .filter(Boolean);

    try {
      const successKeys = [];
      const failedMessages = [];

      for (const group of groupsToDelete) {
        try {
          const result = await deleteGroupOnServer(group);
          if (result.success) {
            successKeys.push(group.groupKey);
          } else {
            failedMessages.push(result.message || group.displayId || group.groupKey);
          }
        } catch (err) {
          console.error(err);
          failedMessages.push(group.displayId || group.groupKey);
        }
      }

      if (successKeys.length > 0) {
        setGroups((prev) => prev.filter((g) => !successKeys.includes(g.groupKey)));
        setSelectedGroupKeys((prev) =>
          prev.filter((key) => !successKeys.includes(key))
        );
        if (selected && successKeys.includes(selected.groupKey)) {
          setOpenDialog(false);
          setSelected(null);
        }
        toast.success(
          `تم حذف ${successKeys.length} طالب${
            successKeys.length === 1 ? "" : "ًا"
          } بنجاح`
        );
      }

      if (failedMessages.length > 0) {
        toast.error(
          `تعذر حذف ${failedMessages.length} طالب، يرجى المحاولة لاحقًا`
        );
      }

      if (successKeys.length > 0) {
        fetchCertificates();
      }
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء حذف الطلاب المحددين");
    } finally {
      setBulkDeleting(false);
    }
  };

  const onUploaded = (newCerts) => {
    setSelected((prev) =>
      prev
        ? {
            ...prev,
            certCount: prev.certCount + newCerts.length,
            certificates: [...newCerts, ...prev.certificates],
          }
        : prev
    );
    setGroups((prev) =>
      prev.map((g) =>
        selected && g.groupKey === selected.groupKey
          ? {
              ...g,
              certCount: g.certCount + newCerts.length,
              certificates: [...newCerts, ...g.certificates],
            }
          : g
      )
    );
  };

  const getDownloadUrl = (url) =>
    url.replace("/upload/", "/upload/fl_attachment/");

  const triggerDownload = (url, filename = "certificate.pdf") => {
    if (!url) return;
    const downloadUrl = url.includes("/upload/") ? getDownloadUrl(url) : url;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteCert = async (certId) => {
    if (!window.confirm("هل تريد حذف هذه الشهادة؟")) return;
    if (!selected?.certificates) return;
    try {
      await api.delete(`/certificates/${certId}`);
      const updatedCerts = selected.certificates.filter((c) => c._id !== certId);
      if (updatedCerts.length === 0) {
        setGroups((prev) =>
          prev.filter((g) => g.groupKey !== selected.groupKey)
        );
        setSelectedGroupKeys((prev) =>
          prev.filter((key) => key !== selected.groupKey)
        );
        setOpenDialog(false);
        setSelected(null);
      } else {
        setSelected((prev) =>
          prev ? { ...prev, certCount: prev.certCount - 1, certificates: updatedCerts } : prev
        );
        setGroups((prev) =>
          prev.map((g) =>
            g.groupKey === selected.groupKey
              ? { ...g, certCount: g.certCount - 1, certificates: updatedCerts }
              : g
          )
        );
      }
      toast.success("تم حذف الشهادة");
      fetchCertificates();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء حذف الشهادة");
    }
  };

  const viewHistory = async (cert) => {
    setHistoricalCert(cert);
    setHistoryLoading(true);
    setOpenHistory(true);
    try {
      const { data } = await api.get(`/certificates/${cert._id}/download-history`);
      setHistoryData(data);
    } catch (err) {
      console.error(err);
      toast.error("تعذر جلب سجل التحميلات");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    try {
      toast.info("جارٍ تحميل البيانات...");
      setLoading(true);

      // جلب جميع البيانات من جميع الصفحات
      let allCertificates = [];
      let currentPage = 1;
      let hasMore = true;
      const limit = 100;

      while (hasMore) {
        try {
          const { data } = await api.get(`/certificates?page=${currentPage}&limit=${limit}`);
          const pageCerts = data.data || [];
          
          if (pageCerts.length > 0) {
            allCertificates = [...allCertificates, ...pageCerts];
          }

          if (pageCerts.length < limit || currentPage >= (data.pagination?.totalPages || 1)) {
            hasMore = false;
          } else {
            currentPage++;
          }
        } catch (e) {
          console.error("Error fetching page:", currentPage, e);
          hasMore = false;
        }
      }

      if (allCertificates.length === 0) {
        toast.error("لا توجد بيانات للتنزيل");
        setLoading(false);
        return;
      }

      // تحضير البيانات للتصدير
      const excelData = allCertificates.map((cert, index) => ({
        "م": index + 1,
        "رقم الشهادة": cert.certificateNumber || cert._id || "",
        "معرف الطالب": cert.studentId || "",
        "اسم الطالب": cert.studentName || cert.traineeName || "",
        "اسم الدورة": cert.courseName || "",
        "اسم المدرب": cert.trainerName || "",
        "تاريخ الإنشاء": cert.createdAt ? new Date(cert.createdAt).toLocaleDateString("ar-EG") : "",
        "تاريخ الإصدار": cert.issueDate ? new Date(cert.issueDate).toLocaleDateString("ar-EG") : "",
        "رابط الشهادة": cert.pdfUrl || cert.certificateUrl || "",
        "رابط التحقق": cert.verificationUrl || (cert.certificateNumber ? `https://desn.pro/verify?certificate=${cert.certificateNumber}` : ""),
      }));

      // إنشاء ورقة عمل
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // تحديد عرض الأعمدة
      const columnWidths = [
        { wch: 5 },   // م
        { wch: 20 },  // رقم الشهادة
        { wch: 15 },  // معرف الطالب
        { wch: 25 },  // اسم الطالب
        { wch: 30 },  // اسم الدورة
        { wch: 20 },  // اسم المدرب
        { wch: 15 },  // تاريخ الإنشاء
        { wch: 15 },  // تاريخ الإصدار
        { wch: 50 },  // رابط الشهادة
        { wch: 50 },  // رابط التحقق
      ];
      worksheet['!cols'] = columnWidths;

      // إنشاء كتاب عمل
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "الشهادات");

      // إنشاء اسم الملف مع التاريخ
      const date = new Date().toISOString().split('T')[0];
      const filename = `الشهادات_${date}.xlsx`;

      // تنزيل الملف
      XLSX.writeFile(workbook, filename);
      
      toast.success(`تم تنزيل ${allCertificates.length} شهادة بنجاح`);
      setLoading(false);
    } catch (err) {
      console.error("Error exporting to Excel:", err);
      toast.error("حدث خطأ أثناء تنزيل البيانات");
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative mt-8 h-72 w-full rounded-xl bg-cover bg-center bg-[url('/img/background-image.png')]">
        <div className="absolute inset-0 bg-gray-900/75" />
      </div>

      <Card className="mx-3 -mt-16 mb-6 lg:mx-4 border shadow">
        <CardHeader className="p-4 text-right">
        <Typography variant="h2" className="font-arabic my-4">
                  إدارة الطلاب والشهادات
                </Typography>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
      
            <div className="flex-1">
       
    
            </div>
            <div className="flex flex-col md:flex-row items-center gap-2">
              <div className="flex items-center gap-x-2">
                <Input
                  label="رقم شهادة"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchStudent();
                    }
                  }}
                  className="font-arabic"
                />
                <Button
                  onClick={handleSearchStudent}
                  disabled={!filter.trim()}
                  color="blue"
                  className="flex items-center gap-x-2 font-arabic"
                >
                  <MagnifyingGlassIcon className="h-5 w-5 text-white" />
                  بحث
                </Button>
              </div>
              <div className="flex items-center gap-x-2">
                <Input
                  label="اسم الطالب"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchByName();
                    }
                  }}
                  className="font-arabic"
                />
                <Button
                  onClick={handleSearchByName}
                  disabled={!nameFilter.trim()}
                  color="purple"
                  className="flex items-center gap-x-2 font-arabic"
                >
                  <MagnifyingGlassIcon className="h-5 w-5 text-white" />
                  بحث بالاسم
                </Button>
              </div>
              <Button
                color="red"
                variant="outlined"
                disabled={selectedGroupKeys.length === 0 || bulkDeleting}
                onClick={handleDeleteSelected}
                className="font-arabic"
              >
                {bulkDeleting ? "جارٍ حذف المحددين..." : "حذف المحددين"}
              </Button>
              <Button
                color="green"
                variant="gradient"
                onClick={handleExportToExcel}
                disabled={loading}
                className="font-arabic flex items-center gap-2"
              >
                <DocumentArrowDownIcon className="h-5 w-5 text-white" />
                تنزيل Excel
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardBody className="px-4 pb-4">
          <TableContainer component={Paper} sx={{ minHeight: 400 }}>
            <Table size="small" sx={{ minWidth: 650 }}>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell padding="checkbox" align="center">
                    <Checkbox
                      color="primary"
                      checked={isAllSelected}
                      indeterminate={
                        selectedGroupKeys.length > 0 && !isAllSelected
                      }
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }} >
                    <Typography variant="h6" className="font-arabic flex-1">
                       رقم شهادة
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    <Typography variant="h6" className="font-arabic flex-1">
                       اسم الطالب
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    <Typography variant="h6" className="font-arabic flex-1">
                       عدد الشهادات
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    <Typography variant="h6" className="font-arabic flex-1">
                       التحميلات
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    <Typography variant="h6" className="font-arabic flex-1">
                       إجراءات
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                  <TableCell colSpan={5} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                  <TableCell colSpan={5} align="center">
                      لا توجد بيانات للعرض
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((g) => (
                    <TableRow 
                      key={g.groupKey}
                      hover
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell padding="checkbox" align="center">
                        <Checkbox
                          color="primary"
                          checked={selectedGroupKeys.includes(g.groupKey)}
                          onChange={() => toggleSelectStudent(g.groupKey)}
                        />
                      </TableCell>
                      <TableCell align="center">{g.displayId}</TableCell>
                      <TableCell align="center" className="font-arabic">
                        {g.studentName || "—"}
                      </TableCell>
                      <TableCell align="center">{g.certCount}</TableCell>
                      <TableCell align="center">
                        <Chip
                          variant="ghost"
                          color="blue"
                          value={`${g.totalDownloads || 0}`}
                          className="rounded-full inline-block"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" gap={1}>
                          <Button
                            variant="outlined"
                            color="blue"
                            onClick={() =>
                              openDialogFor(g, "view")
                            }
                            className="font-arabic"
                          >
                            شهادات
                          </Button>
                          <Button
                            variant="outlined"
                            color="red"
                            onClick={() => handleDeleteStudent(g)}
                            disabled={deletingStud}
                            className="font-arabic"
                          >
                            حذف طالب
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {certResult && (
            <Card className="mt-6 border border-green-200 bg-green-50/70 shadow-sm">
              <CardBody className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <Typography variant="h5" className="font-arabic text-green-700">
                    تم التحقق من الشهادة بنجاح
                  </Typography>
                  <Typography variant="small" className="text-gray-600 font-arabic">
                    رقم الشهادة: {certResult.certificateNumber}
                  </Typography>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right font-arabic">
                  <div className="bg-white/70 rounded-lg p-3 border border-green-100">
                    <Typography color="gray" className="text-sm">اسم المتدرب</Typography>
                    <Typography className="font-semibold text-blue-gray-900">
                      {certResult.studentName || certResult.traineeName || "—"}
                    </Typography>
                  </div>
                  <div className="bg-white/70 rounded-lg p-3 border border-green-100">
                    <Typography color="gray" className="text-sm">اسم الدورة</Typography>
                    <Typography className="font-semibold text-blue-gray-900">
                      {certResult.courseName || "—"}
                    </Typography>
                  </div>
                  <div className="bg-white/70 rounded-lg p-3 border border-green-100">
                    <Typography color="gray" className="text-sm">اسم المدرب</Typography>
                    <Typography className="font-semibold text-blue-gray-900">
                      {certResult.trainerName || "—"}
                    </Typography>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  <Button
                    color="blue"
                    variant="outlined"
                    onClick={() =>
                      window.open(certResult.pdfUrl || certResult.certificateUrl, "_blank")
                    }
                    className="font-arabic"
                  >
                    عرض الشهادة
                  </Button>
                  <Button
                    color="green"
                    onClick={() =>
                      triggerDownload(
                        certResult.pdfUrl || certResult.certificateUrl,
                        `certificate-${certResult.certificateNumber || "download"}.pdf`
                      )
                    }
                    className="font-arabic"
                  >
                    تنزيل الشهادة
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {!loading && pagination.totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Stack spacing={2}>
                <Pagination
                  count={pagination.totalPages}
                  page={pagination.page}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Stack>
            </Box>
          )}
        </CardBody>
      </Card>

      <Dialog
        open={openDialog}
        size="lg"
        handler={() => {
          setOpenDialog(false);
          setSelected(null);
        }}
        className="font-arabic"
      >
        <DialogHeader className="bg-blue-gray-50">
          <Typography variant="h5" className="font-arabic">
            شهادات الطالب: {selected?.displayId || "—"}
          </Typography>
          <IconButton
            variant="text"
            color="gray"
            className="ml-auto"
            onClick={() => {
              setOpenDialog(false);
              setSelected(null);
            }}
          >
            <XMarkIcon className="h-5 w-5" />
          </IconButton>
        </DialogHeader>
        <DialogBody divider className="space-y-4">
          {mode === "add" && (
            <Upload
              studentId={selected?.studentId}
              onUploaded={onUploaded}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {selected?.certificates?.map((cert, idx) => (
              <Card
                key={cert._id}
                className="relative border rounded-lg p-4 flex flex-col gap-3 hover:shadow-lg transition-shadow bg-white"
              >
                <Typography variant="small" className="absolute top-2 left-2 text-gray-500">
                  {new Date(cert.createdAt).toLocaleDateString("ar-EG")}
                </Typography>
                <div className="flex flex-col items-center gap-2 mt-4">
                  <DocumentTextIcon className="h-12 w-12 text-blue-500" />
                  <Typography variant="h6">
                    شهادة {idx + 1}
                  </Typography>
                </div>
                <div className="w-full text-right font-arabic bg-blue-gray-50/60 border border-blue-gray-100 rounded-lg p-3">
                  <div className="text-sm text-blue-gray-600">اسم الدورة</div>
                  <div className="font-semibold text-blue-gray-900">
                    {cert.courseName || "—"}
                  </div>
                  {cert.trainerName && (
                    <div className="mt-2 text-right">
                      <div className="text-sm text-blue-gray-600">اسم المدرب</div>
                      <div className="font-semibold text-blue-gray-900">
                        {cert.trainerName}
                      </div>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-blue-gray-100 flex justify-between items-center w-full">
                    <div className="flex items-center gap-1 text-blue-gray-600">
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      <span className="text-xs font-bold">{cert.downloadCount || 0} تحميل</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="text" 
                      className="p-1 font-arabic flex items-center gap-1 text-xs"
                      onClick={() => viewHistory(cert)}
                    >
                      <ClockIcon className="h-3 w-3" />
                      السجل
                    </Button>
                  </div>
                </div>
                <Box display="flex" justifyContent="center" gap={2} className="mt-auto">
                  <IconButton
                    color="blue"
                    onClick={() => window.open(cert.pdfUrl || cert.certificateUrl, '_blank')}
                  >
                    <EyeIcon className="h-5 w-5" />
                  </IconButton>
                  <IconButton
                    color="green"
                    onClick={() =>
                      triggerDownload(
                        cert.pdfUrl || cert.certificateUrl,
                        `certificate-${cert.certificateNumber || idx + 1}.pdf`
                      )
                    }
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </IconButton>
                  <IconButton
                    color="red"
                    onClick={() => handleDeleteCert(cert._id)}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </IconButton>
                </Box>
              </Card>
            ))}
            {selected?.certificates?.length === 0 && (
              <Typography className="text-center text-gray-500 py-8">
                لا توجد شهادات لهذا الطالب
              </Typography>
            )}
          </div>
        </DialogBody>
        <DialogFooter className="bg-blue-gray-50">
          <Button
            variant="gradient"
            color="blue"
            onClick={() => {
              setOpenDialog(false);
              setSelected(null);
            }}
            className="font-arabic"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Download History Dialog */}
      <Dialog
        open={openHistory}
        size="xs"
        handler={() => setOpenHistory(false)}
        className="font-arabic"
      >
        <DialogHeader className="flex justify-between items-center">
          <Typography variant="h5" className="font-arabic">
            سجل التحميلات
          </Typography>
          <IconButton
            variant="text"
            color="gray"
            onClick={() => setOpenHistory(false)}
          >
            <XMarkIcon className="h-5 w-5" />
          </IconButton>
        </DialogHeader>
        <DialogBody divider className="max-h-[60vh] overflow-y-auto">
          {historyLoading ? (
            <div className="flex justify-center p-8">
              <CircularProgress size={24} />
            </div>
          ) : historyData.length === 0 ? (
            <Typography className="text-center py-8 text-gray-500 font-arabic">
              لم يتم تحميل هذه الشهادة بعد
            </Typography>
          ) : (
            <div className="space-y-4">
              {historyData.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1 p-3 bg-blue-gray-50 rounded-lg border border-blue-gray-100">
                  <div className="flex justify-between items-center border-b border-blue-gray-200 pb-1 mb-1">
                    <Typography className="text-xs font-bold text-blue-gray-700">
                      {new Date(item.timestamp).toLocaleString("ar-EG")}
                    </Typography>
                    <Typography className="text-[10px] text-blue-gray-400">
                      {idx + 1}
                    </Typography>
                  </div>
                  <Typography className="text-[10px] text-blue-gray-600">
                    <span className="font-bold">IP:</span> {item.ip || "—"}
                  </Typography>
                  <Typography className="text-[10px] text-blue-gray-600 truncate" title={item.userAgent}>
                    <span className="font-bold">Device:</span> {item.userAgent || "—"}
                  </Typography>
                </div>
              ))}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            variant="text"
            color="blue-gray"
            onClick={() => setOpenHistory(false)}
            className="font-arabic"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}