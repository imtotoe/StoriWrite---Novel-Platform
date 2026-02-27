import { Button } from "@/components/ui/button";
import { BookOpen, PenTool, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          NovelSpace
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          แพลตฟอร์มอ่านและเขียนนิยายออนไลน์
        </p>
      </div>

      <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col items-center gap-2 rounded-lg border p-6 text-center">
          <BookOpen className="h-8 w-8 text-primary" />
          <h2 className="font-semibold">อ่านนิยาย</h2>
          <p className="text-sm text-muted-foreground">
            ค้นพบนิยายหลากหลายแนว
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-lg border p-6 text-center">
          <PenTool className="h-8 w-8 text-primary" />
          <h2 className="font-semibold">เขียนนิยาย</h2>
          <p className="text-sm text-muted-foreground">
            สร้างสรรค์ผลงานของคุณ
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-lg border p-6 text-center">
          <Users className="h-8 w-8 text-primary" />
          <h2 className="font-semibold">คอมมูนิตี้</h2>
          <p className="text-sm text-muted-foreground">
            ร่วมแลกเปลี่ยนกับนักอ่าน
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button size="lg">เริ่มอ่านเลย</Button>
        <Button size="lg" variant="outline">
          เริ่มเขียน
        </Button>
      </div>
    </div>
  );
}
