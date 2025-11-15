import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useView } from "@/contexts/ViewContext";
import { useHistoricalMigration } from "@/hooks/useHistoricalMigration";
import { StepConfig } from "@/components/accounting/migration/StepConfig";
import { StepApertura } from "@/components/accounting/migration/StepApertura";
import { StepDiario } from "@/components/accounting/migration/StepDiario";
import { StepIVA } from "@/components/accounting/migration/StepIVA";
import { StepBancos } from "@/components/accounting/migration/StepBancos";
import { StepCierre } from "@/components/accounting/migration/StepCierre";

export default function HistoricalImport() {
  const { selectedView } = useView();
  const migration = useHistoricalMigration();

  const breadcrumbs = [
    { label: "Contabilidad", href: "/contabilidad/apuntes" },
    { label: "Migración de Ejercicios" },
  ];

  const progress = (migration.state.step / 6) * 100;

  const stepTitles = [
    "Configuración",
    "Saldo de Apertura",
    "Libro Diario",
    "Libros IVA",
    "Movimientos Bancarios",
    "Cierre del Ejercicio",
  ];

  if (!selectedView || selectedView.type !== 'centre') {
    return (
      <div className="container mx-auto py-6">
        <PageHeader 
          title="Migración de Ejercicios Históricos" 
          breadcrumbs={breadcrumbs}
        />
        <Alert>
          <AlertDescription>
            Selecciona un centro para comenzar la migración de ejercicios históricos.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-1 tracking-tight">
            Migración de Ejercicios Históricos
          </h1>
          <p className="text-sm text-muted-foreground">
            Importa ejercicios contables completos de años anteriores
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Paso {migration.state.step} de 6: {stepTitles[migration.state.step - 1]}
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between">
          {stepTitles.map((title, index) => {
            const stepNumber = index + 1;
            const isActive = migration.state.step === stepNumber;
            const isCompleted = migration.state.step > stepNumber;
            
            return (
              <div
                key={stepNumber}
                className="flex flex-col items-center flex-1"
              >
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-colors ${
                    isCompleted
                      ? 'bg-success border-success text-success-foreground'
                      : isActive
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  {stepNumber}
                </div>
                <span className="text-xs mt-2 text-center text-muted-foreground max-w-[100px]">
                  {title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="mt-8">
          {migration.state.step === 1 && (
            <StepConfig
              config={migration.state.fiscalYear}
              onConfigChange={migration.setFiscalYear}
              onNext={migration.nextStep}
            />
          )}

          {migration.state.step === 2 && (
            <StepApertura
              config={migration.state.fiscalYear}
              completed={migration.state.apertura.completed}
              entryId={migration.state.apertura.entryId}
              onComplete={migration.markAperturaComplete}
              onNext={migration.nextStep}
              onPrev={migration.prevStep}
            />
          )}

          {migration.state.step === 3 && (
            <StepDiario
              config={migration.state.fiscalYear}
              completed={migration.state.diario.completed}
              entriesCount={migration.state.diario.entriesCount}
              totalDebit={migration.state.diario.totalDebit}
              totalCredit={migration.state.diario.totalCredit}
              onComplete={migration.markDiarioComplete}
              onNext={migration.nextStep}
              onPrev={migration.prevStep}
            />
          )}

          {migration.state.step === 4 && (
            <StepIVA
              config={migration.state.fiscalYear}
              emitidasCompleted={migration.state.iva.emitidas.completed}
              emitidasCount={migration.state.iva.emitidas.count}
              recibidasCompleted={migration.state.iva.recibidas.completed}
              recibidasCount={migration.state.iva.recibidas.count}
              onEmitidasComplete={migration.markIVAEmitidasComplete}
              onRecibidasComplete={migration.markIVARecibidasComplete}
              onNext={migration.nextStep}
              onPrev={migration.prevStep}
            />
          )}

          {migration.state.step === 5 && (
            <StepBancos
              config={migration.state.fiscalYear}
              completed={migration.state.bancos.completed}
              movements={migration.state.bancos.movements}
              skipped={migration.state.bancos.skipped}
              onComplete={migration.markBancosComplete}
              onSkip={migration.skipBancos}
              onNext={migration.nextStep}
              onPrev={migration.prevStep}
            />
          )}

          {migration.state.step === 6 && (
            <StepCierre
              state={migration.state}
              onComplete={migration.markCierreComplete}
              onPrev={migration.prevStep}
              onReset={migration.reset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
