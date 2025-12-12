"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

interface ColorSelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  colorMap?: Record<string, string>;
  defaultValue?: string;
  disabled?: boolean;
  name?: string;
}

const ColorSelect = ({ children, value, onValueChange, colorMap, defaultValue, disabled, name }: ColorSelectProps) => {
  const [selectedValue, setSelectedValue] = React.useState(value || defaultValue || "");
  
  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue);
    onValueChange?.(newValue);
  };

  const selectedColor = colorMap?.[selectedValue];

  return (
    <SelectPrimitive.Root
      value={selectedValue}
      onValueChange={handleValueChange}
      defaultValue={defaultValue}
      disabled={disabled}
      name={name}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === SelectTrigger) {
          return React.cloneElement(child, { selectedColor } as any);
        }
        return child;
      })}
    </SelectPrimitive.Root>
  );
};
ColorSelect.displayName = "ColorSelect";

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

// Global color maps for native support
const globalSeverityColors: Record<string, string> = {
  'CRITICAL': '#ef4444',
  'HIGH': '#f97316',
  'MEDIUM': '#eab308',
  'LOW': '#3b82f6',
  'INFO': '#22c55e',
  'UNCLASSIFIED': '#6b7280'
};

const globalStatusColors: Record<string, string> = {
  'OPEN': '#ef4444',
  'IN_PROGRESS': '#3b82f6',
  'RESOLVED': '#22c55e',
  'ACCEPTED_RISK': '#eab308',
  'FALSE_POSITIVE': '#6b7280',
  'RETEST_PENDING': '#a855f7',
  'RETEST_FAILED': '#ef4444'
};

const globalProjectStatusColors: Record<string, string> = {
  'DRAFT': '#6b7280',
  'IN_REVIEW': '#3b82f6',
  'FINAL': '#22c55e',
  'ARCHIVED': '#f97316'
};

const globalCompanyStatusColors: Record<string, string> = {
  'active': '#22c55e',
  'inactive': '#ef4444'
};

const globalAssetStatusColors: Record<string, string> = {
  'active': '#22c55e',
  'inactive': '#ef4444'
};

// Enhanced Select with native color support
const EnhancedSelect = ({ children, colorType = 'none', customColorMap, value, onValueChange, defaultValue, disabled, name }: any) => {
  const [selectedValue, setSelectedValue] = React.useState(value || defaultValue || "");
  
  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue);
    onValueChange?.(newValue);
  };

  // Get color based on type or custom map
  const getSelectedColor = () => {
    if (!selectedValue || selectedValue === 'all') return undefined;
    
    if (customColorMap) return customColorMap[selectedValue];
    if (colorType === 'severity') return globalSeverityColors[selectedValue];
    if (colorType === 'status') return globalStatusColors[selectedValue];
    if (colorType === 'projectStatus') return globalProjectStatusColors[selectedValue];
    if (colorType === 'companyStatus') return globalCompanyStatusColors[selectedValue];
    if (colorType === 'assetStatus') return globalAssetStatusColors[selectedValue];
    return undefined;
  };

  const selectedColor = getSelectedColor();

  return (
    <SelectPrimitive.Root
      value={selectedValue}
      onValueChange={handleValueChange}
      defaultValue={defaultValue}
      disabled={disabled}
      name={name}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === SelectTrigger) {
          return React.cloneElement(child, { selectedColor } as any);
        }
        return child;
      })}
    </SelectPrimitive.Root>
  );
};
EnhancedSelect.displayName = "EnhancedSelect";

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    selectedColor?: string;
  }
>(({ className, children, selectedColor, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    style={selectedColor ? {
      borderColor: selectedColor,
      backgroundColor: `${selectedColor}10`,
      boxShadow: `0 0 0 1px ${selectedColor}20`
    } : undefined}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-select-content-transform-origin]",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
    color?: string;
    icon?: React.ReactNode;
  }
>(({ className, children, color, icon, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:font-medium",
      className
    )}
    {...props}
  >
    <span 
      className="absolute inset-0 rounded-sm pointer-events-none data-[state=unchecked]:hidden"
      style={{
        backgroundColor: color ? `${color}15` : 'transparent'
      }}
    />
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <div className="flex items-center gap-2 relative z-10">
      {icon && <span className="flex-shrink-0" style={color ? { color } : undefined}>{icon}</span>}
      {color && (
        <span 
          className="w-2 h-2 rounded-full flex-shrink-0" 
          style={{ backgroundColor: color }}
        />
      )}
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </div>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  EnhancedSelect,
  ColorSelect,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
