{{- define "techdebt.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "techdebt.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "techdebt.labels" -}}
app.kubernetes.io/name: {{ include "techdebt.name" . }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: techdebt-platform
{{- end -}}

{{- define "techdebt.selectorLabels" -}}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "techdebt.postgresServiceName" -}}
{{- printf "%s-postgres" (include "techdebt.fullname" .) -}}
{{- end -}}

{{- define "techdebt.redisServiceName" -}}
{{- printf "%s-redis" (include "techdebt.fullname" .) -}}
{{- end -}}

{{- define "techdebt.backendServiceName" -}}
{{- printf "%s-backend" (include "techdebt.fullname" .) -}}
{{- end -}}

{{- define "techdebt.frontendServiceName" -}}
{{- printf "%s-frontend" (include "techdebt.fullname" .) -}}
{{- end -}}

{{- define "techdebt.databaseUrl" -}}
{{- printf "postgresql+psycopg://%s:%s@%s:%v/%s" .Values.postgres.auth.username .Values.postgres.auth.password (include "techdebt.postgresServiceName" .) .Values.postgres.service.port .Values.postgres.auth.database -}}
{{- end -}}

{{- define "techdebt.redisUrl" -}}
{{- printf "redis://%s:%v/0" (include "techdebt.redisServiceName" .) .Values.redis.service.port -}}
{{- end -}}
