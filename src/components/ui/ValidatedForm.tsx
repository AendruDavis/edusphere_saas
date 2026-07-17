import React from "react";

export function ValidatedForm({
  children,
  onSubmit,
  className = "space-y-4",
}: {
  children: React.ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  className?: string;
}) {
  const [submitting, setSubmitting] = React.useState(false);

  return (
    <form
      className={className}
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        try {
          setSubmitting(true);
          await onSubmit(event);
        } finally {
          setSubmitting(false);
        }
      }}
      aria-busy={submitting}
    >
      <fieldset disabled={submitting} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
