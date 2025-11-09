import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useCIFAutocomplete, CIFSuggestion } from "@/hooks/useCIFAutocomplete";
import { EnrichedCompanyData } from "@/hooks/useCompanyEnrichment";
import { Search, Building2, MapPin, Flame, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CIFAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (data: EnrichedCompanyData) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function CIFAutocompleteInput({
  value,
  onChange,
  onSelect,
  disabled = false,
  placeholder = "B12345678",
  className
}: CIFAutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const { suggestions, isSearching } = useCIFAutocomplete(inputValue);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Open popover when we have suggestions
  useEffect(() => {
    if (suggestions.length > 0 && inputValue.length >= 3) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [suggestions, inputValue]);

  const handleInputChange = (newValue: string) => {
    const upperValue = newValue.toUpperCase();
    setInputValue(upperValue);
    onChange(upperValue);
  };

  const handleSelect = (suggestion: CIFSuggestion) => {
    setInputValue(suggestion.cif);
    onChange(suggestion.cif);
    onSelect(suggestion.enriched_data);
    setOpen(false);
    inputRef.current?.blur();
  };

  const highlightMatch = (text: string, pattern: string) => {
    const index = text.toLowerCase().indexOf(pattern.toLowerCase());
    if (index === -1) return <span>{text}</span>;

    return (
      <span>
        <strong className="font-semibold text-foreground">{text.slice(0, index + pattern.length)}</strong>
        <span className="text-muted-foreground">{text.slice(index + pattern.length)}</span>
      </span>
    );
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high":
        return <Badge variant="default" className="text-xs">ALTA</Badge>;
      case "medium":
        return <Badge variant="secondary" className="text-xs">MEDIA</Badge>;
      case "low":
        return <Badge variant="outline" className="text-xs">BAJA</Badge>;
      default:
        return null;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn("pr-10", className)}
            onFocus={() => {
              if (suggestions.length > 0 && inputValue.length >= 3) {
                setOpen(true);
              }
            }}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 w-[400px]" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            <CommandEmpty>
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Search className="mx-auto h-8 w-8 mb-2 opacity-30" />
                <p>No hay empresas en caché para "{inputValue}"</p>
                <p className="text-xs mt-1">Usa "🔍 Buscar con IA" para encontrar</p>
              </div>
            </CommandEmpty>
            <CommandGroup heading={`💾 ${suggestions.length} ${suggestions.length === 1 ? 'empresa' : 'empresas'} en caché`}>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.cif}
                  onSelect={() => handleSelect(suggestion)}
                  className="flex flex-col items-start gap-2 py-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1">
                      <div className="font-mono text-sm font-medium">
                        {highlightMatch(suggestion.cif, inputValue)}
                      </div>
                      <div className="text-sm font-medium text-foreground mt-0.5">
                        {suggestion.razon_social}
                      </div>
                    </div>
                    {getConfidenceBadge(suggestion.confidence)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground w-full">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <span>{suggestion.tipo_sociedad}</span>
                    </div>
                    {suggestion.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{suggestion.location}</span>
                      </div>
                    )}
                    {suggestion.search_count > 10 && (
                      <div className="flex items-center gap-1 ml-auto">
                        <Flame className="h-3 w-3 text-orange-500" />
                        <span className="text-orange-500 font-medium">{suggestion.search_count} búsquedas</span>
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
