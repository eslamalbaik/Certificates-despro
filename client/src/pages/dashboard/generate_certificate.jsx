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
} from "@material-tailwind/react";
import api from "@/configs/api";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

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
          (data.certificateNumber ? `https://desn.pro/verify?certificate=${data.certificateNumber}` : undefined),
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

    try {
      // Parse the data - expecting format: studentName, courseName (one per line)
      const lines = batchData.trim().split('\n').filter(line => line.trim());
      const certificates = [];

      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 2) {
          continue; // Skip invalid lines
        }
        const studentName = parts[0];
        const courseName = parts.slice(1).join(','); // In case course name contains commas
        
        if (studentName && courseName) {
          certificates.push({
            traineeName: studentName,
            courseName: courseName,
            trainerName: batchTrainerName.trim() || "شوق الجهني",
          });
        }
      }

      if (certificates.length === 0) {
        setBatchError("لم يتم العثور على بيانات صحيحة. تنسيق البيانات: اسم الطالب، اسم الدورة (سطر لكل طالب)");
        setBatchSubmitting(false);
        return;
      }

      // Generate certificates one by one
      const results = [];
      const errors = [];
      
      for (let i = 0; i < certificates.length; i++) {
        try {
          const cert = certificates[i];
          const { data } = await api.post("/certificates/generate-fixed", cert);
          results.push({
            ...cert,
            success: true,
            certificateNumber: data.certificateNumber,
            pdfUrl: data.pdfUrl,
          });
          toast.success(`تم إنشاء شهادة ${i + 1}/${certificates.length}: ${cert.traineeName}`);
        } catch (err) {
          const message = err.response?.data?.message || "فشل إنشاء الشهادة";
          errors.push({
            ...certificates[i],
            error: message,
          });
          toast.error(`فشل إنشاء شهادة ${i + 1}: ${certificates[i].traineeName}`);
        }
      }

      setBatchResult({
        total: certificates.length,
        success: results.length,
        failed: errors.length,
        results: results,
        errors: errors,
      });

      if (results.length > 0) {
        toast.success(`تم إنشاء ${results.length} من ${certificates.length} شهادة بنجاح`);
      }
    } catch (err) {
      const message = err.response?.data?.message || "حدث خطأ أثناء إنشاء الشهادات";
      setBatchError(message);
      toast.error(message);
    } finally {
      setBatchSubmitting(false);
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
                    href={result.verifyUrl || `https://desn.pro/verify?certificate=${result.certificateNumber}`}
                    className="text-blue-600 underline break-all"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {result.verifyUrl || `https://desn.pro/verify?certificate=${result.certificateNumber}`}
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

                  <div>
                    <Textarea
                      label="بيانات الطلاب (سطر لكل طالب)"
                      placeholder="اسم الطالب، اسم الدورة"
                      value={batchData}
                      onChange={(e) => setBatchData(e.target.value)}
                      className="font-arabic min-h-[300px]"
                      helperText="تنسيق البيانات: اسم الطالب، اسم الدورة (كل سطر يحتوي على طالب واحد)"
                    />
                    <Typography variant="small" className="text-gray-600 font-arabic mt-2">
                      مثال:<br />
                      أحمد محمد، دورة التصميم الجرافيكي<br />
                      فاطمة علي، دورة التسويق الرقمي<br />
                      خالد إبراهيم، دورة البرمجة
                    </Typography>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleBatchGenerate}
                      color="green"
                      className="min-w-[180px] font-arabic"
                      disabled={batchSubmitting || !batchData.trim()}
                    >
                      {batchSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Spinner className="h-4 w-4" /> جارٍ الإنشاء…
                        </span>
                      ) : (
                        "إصدار الشهادات"
                      )}
                    </Button>
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
                          <div className="text-red-600 font-arabic">فشل</div>
                          <div className="font-bold text-red-900 text-xl">{batchResult.failed}</div>
                        </div>
                      </div>

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


