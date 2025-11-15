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
import { LogsViewer } from "@/components/accounting/migration/LogsViewer";
import { CheckCircle2, Loader2 } from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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

        {/* Step Indicators Mejorados */}
        <TooltipProvider>
          <div className="flex items-center justify-between relative">
            {stepTitles.map((title, index) => {
              const stepNumber = index + 1;
              const isActive = migration.state.step === stepNumber;
              const isCompleted = migration.state.step > stepNumber;
              
              // Generar contenido del tooltip según el step
              const getTooltipContent = () => {
                if (!isCompleted) return null;
                
                switch (stepNumber) {
                  case 1:
                    return (
                      <div className="text-xs space-y-1">
                        <p className="font-semibold">✅ Configuración guardada</p>
                        <p>Ejercicio: {migration.state.fiscalYear.year}</p>
                        <p>Centro: {migration.state.fiscalYear.centroCode}</p>
                        <p className="text-muted-foreground">
                          {new Date(migration.state.fiscalYear.startDate).toLocaleDateString('es-ES')} - 
                          {new Date(migration.state.fiscalYear.endDate).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    );
                  case 2:
                    return migration.state.apertura.completed ? (
                      <div className="text-xs space-y-1">
                        <p className="font-semibold">✅ Asiento de apertura creado</p>
                        {migration.state.apertura.date && (
                          <p>Fecha: {new Date(migration.state.apertura.date).toLocaleDateString('es-ES')}</p>
                        )}
                        {migration.state.apertura.entryId && (
                          <p className="text-muted-foreground text-[10px]">ID: {migration.state.apertura.entryId.substring(0, 8)}...</p>
                        )}
                      </div>
                    ) : null;
                  case 3:
                    return migration.state.diario.completed ? (
                      <div className="text-xs space-y-1">
                        <p className="font-semibold">✅ Diario importado</p>
                        <p className="font-mono">{migration.state.diario.entriesCount} asientos</p>
                        {migration.state.diario.totalDebit && (
                          <>
                            <p className="text-success">Debe: {migration.state.diario.totalDebit.toFixed(2)} €</p>
                            <p className="text-success">Haber: {migration.state.diario.totalCredit?.toFixed(2)} €</p>
                          </>
                        )}
                      </div>
                    ) : null;
                  case 4:
                    return (migration.state.iva.emitidas.completed && migration.state.iva.recibidas.completed) ? (
                      <div className="text-xs space-y-1">
                        <p className="font-semibold">✅ Libros IVA importados</p>
                        <p>Emitidas: {migration.state.iva.emitidas.count} facturas</p>
                        <p>Recibidas: {migration.state.iva.recibidas.count} facturas</p>
                      </div>
                    ) : null;
                  case 5:
                    return migration.state.bancos.completed ? (
                      <div className="text-xs space-y-1">
                        <p className="font-semibold">
                          {migration.state.bancos.skipped ? '⏭️ Bancos omitidos' : '✅ Bancos importados'}
                        </p>
                        {!migration.state.bancos.skipped && (
                          <p>{migration.state.bancos.movements} movimientos</p>
                        )}
                      </div>
                    ) : null;
                  case 6:
                    return migration.state.cierre.completed ? (
                      <div className="text-xs space-y-1">
                        <p className="font-semibold">✅ Ejercicio cerrado</p>
                        {migration.state.cierre.closedAt && (
                          <p className="text-muted-foreground">
                            {new Date(migration.state.cierre.closedAt).toLocaleDateString('es-ES', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    ) : null;
                  default:
                    return null;
                }
              };
              
              const tooltipContent = getTooltipContent();
              
              return (
                <div key={stepNumber} className="flex items-center flex-1">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center flex-1 relative z-10">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          {/* Círculo principal */}
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-all duration-300",
                              isCompleted && "bg-success border-success text-success-foreground shadow-lg shadow-success/20",
                              isActive && "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30",
                              !isCompleted && !isActive && "bg-background border-border text-muted-foreground"
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : isActive ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <span>{stepNumber}</span>
                            )}
                          </div>
                          
                          {/* Animación de pulso para step activo */}
                          {isActive && (
                            <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-40" />
                          )}
                        </div>
                      </TooltipTrigger>
                      
                      {/* Tooltip con resumen */}
                      {tooltipContent && (
                        <TooltipContent side="bottom" className="max-w-xs">
                          {tooltipContent}
                        </TooltipContent>
                      )}
                    </Tooltip>
                    
                    <span className={cn(
                      "text-xs mt-2 text-center max-w-[100px] transition-colors",
                      isActive && "font-semibold text-foreground",
                      isCompleted && "text-success",
                      !isActive && !isCompleted && "text-muted-foreground"
                    )}>
                      {title}
                    </span>
                  </div>
                  
                  {/* Línea conectora entre steps */}
                  {index < stepTitles.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 transition-all duration-500 relative -top-5">
                      <div className={cn(
                        "h-full transition-colors duration-500",
                        migration.state.step > stepNumber ? "bg-success" : "bg-border"
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Step Content */}
        <div className="mt-8">
          {migration.state.step === 1 && (
            <StepConfig
              config={migration.state.fiscalYear}
              onConfigChange={migration.setFiscalYear}
              onMigrationRunCreated={migration.setMigrationRunId}
              onNext={migration.nextStep}
            />
          )}

          {migration.state.step === 2 && (
            <StepApertura
              config={migration.state.fiscalYear}
              completed={migration.state.apertura.completed}
              entryId={migration.state.apertura.entryId}
              migrationRunId={migration.state.migrationRunId}
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

        {/* Logs Viewer - Always visible */}
        {migration.state.migrationRunId && (
          <div className="mt-8">
            <LogsViewer
              migrationRunId={migration.state.migrationRunId}
              fiscalYearId={migration.state.fiscalYear.fiscalYearId}
              autoRefresh={migration.state.step < 6}
              maxHeight="500px"
            />
          </div>
        )}
      </div>
    </div>
  );
}
