type SectionHeadingProps = {
  title: string
  description?: string
  tone?: 'dark' | 'light'
  align?: 'start' | 'split'
}

export function SectionHeading({ title, description, tone = 'dark', align = 'split' }: SectionHeadingProps) {
  return (
    <div className={`section-heading section-heading--${tone} section-heading--${align}`}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  )
}
