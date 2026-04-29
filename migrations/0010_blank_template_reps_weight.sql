-- One-time data migration: blank out reps and weight on every existing template.
-- New templates created after this migration already store NULL values, but
-- templates saved before this change still hold the original workout's numbers.
UPDATE templates
SET exercises = (
  SELECT json_group_array(
    json_object(
      'name', json_extract(je.value, '$.name'),
      'sets', json_extract(je.value, '$.sets'),
      'reps', NULL,
      'weight', NULL,
      'unit', json_extract(je.value, '$.unit')
    )
  )
  FROM json_each(templates.exercises) AS je
);
