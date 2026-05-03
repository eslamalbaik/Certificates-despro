import React, { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Typography,
  Input,
  Button,
  Spinner,
  Alert,
  Tabs,
  TabsHeader,
  TabsBody,
  Tab,
  TabPanel,
  Textarea,
  IconButton,
  Progress,
} from "@material-tailwind/react";
import api from "@/configs/api";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { CloudArrowUpIcon, TrashIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

export default function GenerateCertificate() {
  const [activeTab, setActiveTab] = useState("single");
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    defaultValues: {
      studentName: "",
      courseName: "",
      trainerName: "",
    },
    mode: "onSubmit",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  
  // Batch generation state
  const [batchData, setBatchData] = useState("");
  const [batchTrainerName, setBatchTrainerName] = useState("شوق الجهني");
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [batchError, setBatchError] = useState("");
  const [uploadedData, setUploadedData] = useState([]);
  const [fileName, setFileName] = useState("");
  
  // Progress states
  const [currentProgress, setCurrentProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState({
    success: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    currentName: ""
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error("الملف فارغ");
          return;
        }

        // Map data based on the provided sample structure
        // Headers found: ["م","رقم الشهادة","معرف الطالب","اسم الطالب","اسم الدورة","اسم المدرب","تاريخ الإنشاء","تاريخ الإصدار","رابط الشهادة","رابط التحقق"]
        const mappedData = data.map((row) => ({
          studentName: row["اسم الطالب"] || row["Name"] || row["Student Name"] || "",
          courseName: row["اسم الدورة"] || row["Course"] || row["Course Name"] || "",
          trainerName: row["اسم المدرب"] || row["Trainer"] || row["Trainer Name"] || batchTrainerName,
        })).filter(item => item.studentName && item.courseName);

        if (mappedData.length === 0) {
          toast.error("لم يتم العثور على بيانات صالحة (يجب توفر اسم الطالب واسم الدورة)");
          return;
        }

        setUploadedData(mappedData);
        
        // Also update batchData string for legacy support or manual editing
        const dataString = mappedData.map(item => `${item.studentName}, ${item.courseName}`).join("\n");
        setBatchData(dataString);
        
        toast.success(`تم تحميل ${mappedData.length} سجل بنجاح`);
      } catch (err) {
        console.error("Excel parse error:", err);
        toast.error("حدث خطأ أثناء قراءة ملف Excel");
      }
    };
    reader.readAsBinaryString(file);
  };

  const removeUploadedData = () => {
    setUploadedData([]);
    setFileName("");
    setBatchData("");
  };

  const onSubmit = async (values) => {
    setError("");

    setSubmitting(true);
    try {
      const { data } = await api.post("/certificates/generate-fixed", {
        traineeName: values.studentName.trim(),
        courseName: values.courseName.trim(),
        trainerName: values.trainerName.trim(),
        // certificateNumber, issueDate optional by backend if omitted
      });

      const normalized = {
        success: data.message ? true : (data.success ?? true),
        certificateNumber: data.certificateNumber,
        issueDate: data.issueDate,
        pdfUrl: data.pdfUrl,
        verifyUrl:
          data.verificationUrl || data.verifyUrl ||
          (data.certificateNumber ? `https://verifydespro.online/?certificate=${data.certificateNumber}` : undefined),
      };
      setResult(normalized);
      if (normalized.pdfUrl) {
        try { window.open(normalized.pdfUrl, "_blank"); } catch (_) {}
      }
    } catch (err) {
      const message = err.response
        ? (err.response.data?.message || err.response.data?.error || "خطأ من الخادم")
        : (err.request ? "تعذر الاتصال بالخادم، تحقق من الشبكة أو CORS" : (err.message || "تعذر إنشاء الشهادة"));
      setError(message);
      setResult(null);
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    reset();
    setResult(null);
    setError("");
  };

  // Batch generation handler
  const handleBatchGenerate = async () => {
    if (!batchData.trim()) {
      setBatchError("الرجاء إدخال البيانات");
      return;
    }

    setBatchError("");
    setBatchSubmitting(true);
    setBatchResult(null);
    setCurrentProgress(0);

    try {
      let certificates = [];

      if (uploadedData.length > 0) {
        certificates = uploadedData.map(item => ({
          traineeName: item.studentName,
          courseName: item.courseName,
          trainerName: item.trainerName || batchTrainerName.trim() || "شوق الجهني",
        }));
      } else {
        const lines = batchData.trim().split('\n').filter(line => line.trim());
        for (const line of lines) {
          const parts = line.split(',').map(p => p.trim());
          if (parts.length < 2) continue;
          const studentName = parts[0];
          const courseName = parts.slice(1).join(',');
          
          if (studentName && courseName) {
            certificates.push({
              traineeName: studentName,
              courseName: courseName,
              trainerName: batchTrainerName.trim() || "شوق الجهني",
            });
          }
        }
      }

      if (certificates.length === 0) {
        setBatchError("لم يتم العثور على بيانات صحيحة.");
        setBatchSubmitting(false);
        return;
      }

      setProcessingStatus({
        success: 0,
        failed: 0,
        total: certificates.length,
        currentName: ""
      });

      const results = [];
      const errors = [];
      const skipped = [];
      
      // Dynamic chunking for better performance (Concurrency control)
      const CONCURRENCY = 3; 
      const MAX_RETRIES = 2;
      
      const processCertificate = async (cert, index) => {
        let retryCount = 0;
        let lastError = "";

        while (retryCount <= MAX_RETRIES) {
          try {
            setProcessingStatus(prev => ({ ...prev, currentName: cert.traineeName }));
            const { data } = await api.post("/certificates/generate-fixed", cert);
            
            const result = {
              ...cert,
              success: true,
              certificateNumber: data.certificateNumber,
              pdfUrl: data.pdfUrl,
            };
            
            results.push(result);
            setProcessingStatus(prev => ({ ...prev, success: prev.success + 1 }));
            setCurrentProgress(Math.round(((results.length + errors.length + skipped.length) / certificates.length) * 100));
            return; 
          } catch (err) {
            if (err.response?.status === 409) {
              // Handle duplicate
              skipped.push({ ...cert, message: "مرفوعة مسبقاً" });
              setProcessingStatus(prev => ({ ...prev, skipped: prev.skipped + 1 }));
              setCurrentProgress(Math.round(((results.length + errors.length + skipped.length) / certificates.length) * 100));
              return; // Exit retry loop for duplicates
            }

            lastError = err.response?.data?.message || "فشل إنشاء الشهادة";
            retryCount++;
            if (retryCount <= MAX_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); 
            }
          }
        }

        // Final failure after retries
        errors.push({ ...cert, error: lastError });
        setProcessingStatus(prev => ({ ...prev, failed: prev.failed + 1 }));
        setCurrentProgress(Math.round(((results.length + errors.length + skipped.length) / certificates.length) * 100));
      };

      // Process in batches
      for (let i = 0; i < certificates.length; i += CONCURRENCY) {
        const batch = certificates.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map((cert, idx) => processCertificate(cert, i + idx)));
        // Tiny delay between batches to let the server breathe
        if (i + CONCURRENCY < certificates.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      setBatchResult({
        total: certificates.length,
        success: results.length,
        failed: errors.length,
        skipped: skipped.length,
        results: results,
        errors: errors,
        skippedItems: skipped,
      });

      if (results.length > 0 || skipped.length > 0) {
        toast.success(`تم إتمام العملية. نجاح: ${results.length}, تجاوز: ${skipped.length}, فشل: ${errors.length}`);
      }
    } catch (err) {
      console.error("Batch generate error:", err);
      setBatchError("حدث خطأ غير متوقع أثناء المعالجة");
    } finally {
      setBatchSubmitting(false);
      setProcessingStatus(prev => ({ ...prev, currentName: "" }));
    }
  };

  return (
    <>
      <div className="relative mt-8 h-72 w-full rounded-xl bg-cover bg-center bg-[url('/img/background-image.png')]">
        <div className="absolute inset-0 bg-gray-900/75" />
      </div>

      <Card className="mx-3 -mt-16 mb-6 lg:mx-4 border border-blue-gray-100 shadow-lg">
        <CardHeader floated={false} shadow={false} className="p-6 text-right">
          <div className="flex items-center justify-between">
            <Typography variant="h2" className="font-arabic">
              مولد الشهادات
            </Typography>
            {result && (
              <Button color="red" variant="outlined" onClick={resetAll} className="font-arabic">
                بدء عملية جديدة
              </Button>
            )}
          </div>
          <Typography variant="small" className="text-blue-gray-600 font-arabic mt-2">
            أدخل بيانات الشهادة ثم اضغط إنشاء
          </Typography>
        </CardHeader>

        <CardBody className="p-6 space-y-6">
          <Tabs value={activeTab} className="w-full">
            <TabsHeader className="bg-blue-gray-50" indicatorProps={{ className: "bg-blue-500" }}>
              <Tab key="single" value="single" onClick={() => setActiveTab("single")} className="font-arabic">
                شهادة واحدة
              </Tab>
              <Tab key="batch" value="batch" onClick={() => setActiveTab("batch")} className="font-arabic">
                إصدار دفعة
              </Tab>
            </TabsHeader>
            <TabsBody>
              <TabPanel key="single" value="single">
                {error && (
                  <Alert color="red" className="font-arabic mb-4">
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="اسم المتدرب"
                className="font-arabic"
                {...register("studentName", { required: true, minLength: 2 })}
              />
              {errors.studentName && (
                <span className="text-red-600 text-sm font-arabic">هذا الحقل مطلوب</span>
              )}
            </div>
            
            
            <div>
              <Input
                label="اسم الدورة التعليمية"
                className="font-arabic"
                {...register("courseName", { required: true, minLength: 2 })}
              />
              {errors.courseName && (
                <span className="text-red-600 text-sm font-arabic">هذا الحقل مطلوب</span>
              )}
            </div>
            <div>
              <Input
                label="اسم المدرب"
                className="font-arabic"
                {...register("trainerName", { required: true, minLength: 2 })}
              />
              {errors.trainerName && (
                <span className="text-red-600 text-sm font-arabic">هذا الحقل مطلوب</span>
              )}
            </div>
            

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" color="blue" className="min-w-[180px] font-arabic" disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2"><Spinner className="h-4 w-4" /> جارٍ الإنشاء…</span>
                ) : (
                  "إنشاء الشهادة"
                )}
              </Button>
            </div>
          </form>

          {result && result.certificateNumber && (
            <div className="mt-2 border border-blue-gray-100 rounded-xl p-4 bg-blue-gray-50/30">
              <Typography variant="h5" className="font-arabic mb-4 text-right">
                تم إنشاء الشهادة بنجاح
              </Typography>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                <div className="space-y-1">
                  <div className="text-blue-gray-600 font-arabic">رقم الشهادة</div>
                  <div className="font-bold text-blue-900">{result.certificateNumber}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-blue-gray-600 font-arabic">تاريخ الإصدار</div>
                  <div className="font-bold text-blue-900">{result.issueDate || new Date().toLocaleDateString("ar-EG")}</div>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <div className="text-blue-gray-600 font-arabic">رابط التحقق</div>
                  <a
                    href={result.verifyUrl || `https://verifydespro.online/?certificate=${result.certificateNumber}`}
                    className="text-blue-600 underline break-all"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {result.verifyUrl || `https://verifydespro.online/?certificate=${result.certificateNumber}`}
                  </a>
                </div>
              </div>

              {result.pdfUrl && (
                <div className="mt-6 flex justify-end">
                  <Button color="green" onClick={() => window.open(result.pdfUrl, "_blank")} className="font-arabic min-w-[180px]">
                    تنزيل الشهادة PDF
                  </Button>
                </div>
              )}
            </div>
          )}
              </TabPanel>

              <TabPanel key="batch" value="batch">
                {batchError && (
                  <Alert color="red" className="font-arabic mb-4">
                    {batchError}
                  </Alert>
                )}

                <div className="space-y-4">
                  <div>
                    <Input
                      label="اسم المدرب (لجميع الشهادات)"
                      value={batchTrainerName}
                      onChange={(e) => setBatchTrainerName(e.target.value)}
                      className="font-arabic"
                      defaultValue="شوق الجهني"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Typography variant="h6" color="blue-gray" className="font-arabic">
                        خيار 1: رفع ملف Excel
                      </Typography>
                      <div 
                        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors ${
                          fileName ? "border-green-500 bg-green-50/30" : "border-blue-gray-200 hover:border-blue-500"
                        }`}
                      >
                        {!fileName ? (
                          <>
                            <CloudArrowUpIcon className="h-12 w-12 text-blue-gray-300 mb-2" />
                            <Typography className="font-arabic text-center mb-4">
                              اسحب ملف Excel هنا أو اضغط للاختيار
                            </Typography>
                            <label className="cursor-pointer bg-blue-500 text-white px-6 py-2 rounded-lg font-arabic hover:bg-blue-600 transition-colors">
                              اختيار ملف
                              <input 
                                type="file" 
                                className="hidden" 
                                accept=".xlsx, .xls, .csv" 
                                onChange={handleFileUpload}
                              />
                            </label>
                          </>
                        ) : (
                          <div className="flex flex-col items-center w-full">
                            <DocumentTextIcon className="h-12 w-12 text-green-500 mb-2" />
                            <Typography className="font-arabic font-bold text-green-700 mb-1">
                              {fileName}
                            </Typography>
                            <Typography variant="small" className="font-arabic text-blue-gray-600 mb-4">
                              تم العثور على {uploadedData.length} سجل
                            </Typography>
                            <Button 
                              variant="text" 
                              color="red" 
                              size="sm" 
                              className="flex items-center gap-2 font-arabic"
                              onClick={removeUploadedData}
                            >
                              <TrashIcon className="h-4 w-4" /> حذف الملف
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Typography variant="h6" color="blue-gray" className="font-arabic">
                        خيار 2: إدخال يدوي (نصي)
                      </Typography>
                      <Textarea
                        label="بيانات الطلاب (سطر لكل طالب)"
                        placeholder="اسم الطالب، اسم الدورة"
                        value={batchData}
                        onChange={(e) => setBatchData(e.target.value)}
                        className="font-arabic min-h-[200px]"
                      />
                      <Typography variant="small" className="text-gray-600 font-arabic">
                        مثال: أحمد محمد، دورة التصميم الجرافيكي
                      </Typography>
                    </div>
                  </div>

                  {uploadedData.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <Typography variant="h6" className="font-arabic mb-3 text-blue-800 flex items-center gap-2">
                        <DocumentTextIcon className="h-5 w-5" /> معاينة البيانات المستخرجة:
                      </Typography>
                      <div className="max-h-[200px] overflow-y-auto">
                        <table className="w-full text-right font-arabic">
                          <thead className="bg-blue-100/50 sticky top-0">
                            <tr>
                              <th className="p-2 text-sm font-bold border-b border-blue-200">الاسم</th>
                              <th className="p-2 text-sm font-bold border-b border-blue-200">الدورة</th>
                              <th className="p-2 text-sm font-bold border-b border-blue-200">المدرب</th>
                            </tr>
                          </thead>
                          <tbody>
                            {uploadedData.slice(0, 50).map((row, idx) => (
                              <tr key={idx} className="border-b border-blue-50 hover:bg-white/50">
                                <td className="p-2 text-sm">{row.studentName}</td>
                                <td className="p-2 text-sm">{row.courseName}</td>
                                <td className="p-2 text-sm">{row.trainerName}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {uploadedData.length > 50 && (
                          <Typography variant="small" className="text-center mt-2 text-blue-gray-400 font-arabic">
                            ... وعرض {uploadedData.length - 50} سجل إضافي
                          </Typography>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    {batchSubmitting && (
                      <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm space-y-4 animate-pulse">
                        <div className="flex justify-between items-center mb-2">
                          <Typography className="font-arabic font-bold text-blue-900">
                            جارٍ معالجة الشهادات... ({processingStatus.success + processingStatus.failed} / {processingStatus.total})
                          </Typography>
                          <Typography className="font-arabic text-blue-600 font-bold">
                            {currentProgress}%
                          </Typography>
                        </div>
                        <Progress value={currentProgress} color="blue" size="lg" className="border border-blue-100" />
                        <div className="flex justify-between items-center text-sm font-arabic">
                          <span className="text-green-600">نجاح: {processingStatus.success}</span>
                          <span className="text-orange-600">تخطى (موجود مسبقاً): {processingStatus.skipped}</span>
                          <span className="text-red-600">فشل: {processingStatus.failed}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-blue-gray-400 italic font-arabic text-xs">
                            {processingStatus.currentName ? `جاري العمل على: ${processingStatus.currentName}` : "بدء العمل..."}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        onClick={handleBatchGenerate}
                        color="green"
                        className="min-w-[200px] font-arabic h-12 text-lg shadow-green-200/50"
                        disabled={batchSubmitting || (!batchData.trim() && uploadedData.length === 0)}
                      >
                        {batchSubmitting ? (
                          <span className="flex items-center gap-2">
                            <Spinner className="h-5 w-5" /> جارٍ الإصدار...
                          </span>
                        ) : (
                          "إصدار الشهادات الآن"
                        )}
                      </Button>
                    </div>
                  </div>

                  {batchResult && (
                    <div className="mt-6 border border-blue-gray-100 rounded-xl p-4 bg-blue-gray-50/30">
                      <Typography variant="h5" className="font-arabic mb-4 text-right">
                        نتائج إصدار الشهادات
                      </Typography>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right mb-4">
                        <div className="space-y-1">
                          <div className="text-blue-gray-600 font-arabic">المجموع</div>
                          <div className="font-bold text-blue-900 text-xl">{batchResult.total}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-green-600 font-arabic">نجح</div>
                          <div className="font-bold text-green-900 text-xl">{batchResult.success}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-orange-600 font-arabic">موجود مسبقاً</div>
                          <div className="font-bold text-orange-900 text-xl">{batchResult.skipped}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-red-600 font-arabic">فشل</div>
                          <div className="font-bold text-red-900 text-xl">{batchResult.failed}</div>
                        </div>
                      </div>

                      {batchResult.skippedItems && batchResult.skippedItems.length > 0 && (
                        <div className="mt-4">
                          <Typography variant="h6" className="font-arabic mb-2 text-orange-700">
                            الشهادات الموجودة مسبقاً (تم تخطيها):
                          </Typography>
                          <div className="max-h-[150px] overflow-y-auto space-y-2">
                            {batchResult.skippedItems.map((s, idx) => (
                              <div key={idx} className="bg-orange-50 p-2 rounded border border-orange-100 text-right font-arabic text-sm">
                                <span className="font-semibold">{s.traineeName}</span> - {s.courseName}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {batchResult.results && batchResult.results.length > 0 && (
                        <div className="mt-4">
                          <Typography variant="h6" className="font-arabic mb-2 text-green-700">
                            الشهادات الناجحة:
                          </Typography>
                          <div className="max-h-[200px] overflow-y-auto space-y-2">
                            {batchResult.results.map((r, idx) => (
                              <div key={idx} className="bg-white p-2 rounded border border-green-200 text-right font-arabic">
                                <div className="font-semibold">{r.traineeName}</div>
                                <div className="text-sm text-gray-600">{r.courseName}</div>
                                <div className="text-xs text-blue-600">رقم الشهادة: {r.certificateNumber}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {batchResult.errors && batchResult.errors.length > 0 && (
                        <div className="mt-4">
                          <Typography variant="h6" className="font-arabic mb-2 text-red-700">
                            الشهادات الفاشلة:
                          </Typography>
                          <div className="max-h-[200px] overflow-y-auto space-y-2">
                            {batchResult.errors.map((e, idx) => (
                              <div key={idx} className="bg-white p-2 rounded border border-red-200 text-right font-arabic">
                                <div className="font-semibold">{e.traineeName}</div>
                                <div className="text-sm text-gray-600">{e.courseName}</div>
                                <div className="text-xs text-red-600">خطأ: {e.error}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabPanel>
            </TabsBody>
          </Tabs>
        </CardBody>
      </Card>
    </>
  );
}


