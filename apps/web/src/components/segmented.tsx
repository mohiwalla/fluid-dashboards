import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control"

type Option<T extends string> = { value: T; label: string; title?: string }

/** 2–4 choices: ui-sdk segmented control (one tab stop, arrow keys, sliding indicator). */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  stretch = false,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: readonly Option<T>[]
  stretch?: boolean
}) {
  return (
    <SegmentedControl
      aria-label={label}
      value={value}
      onValueChange={(next) => next && onChange(next as T)}
      className={stretch ? "stretch" : undefined}
    >
      <SegmentedControlIndicator />
      {options.map((option) => (
        <SegmentedControlItem
          key={option.value}
          value={option.value}
          title={option.title}
        >
          {option.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}
