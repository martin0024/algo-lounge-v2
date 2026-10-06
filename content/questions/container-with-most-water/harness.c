#include "cJSON.h"
#include <stdlib.h>

int maxArea(int *height, int heightSize);

char *al_solve(const char *args_json) {
  cJSON *root = cJSON_Parse(args_json);
  cJSON *jh = cJSON_GetArrayItem(root, 0);
  int n = cJSON_GetArraySize(jh);
  int *height = (int *)malloc(sizeof(int) * (n > 0 ? n : 1));
  for (int i = 0; i < n; i++)
    height[i] = (int)cJSON_GetArrayItem(jh, i)->valuedouble;

  cJSON *out = cJSON_CreateNumber(maxArea(height, n));
  char *s = cJSON_PrintUnformatted(out);

  free(height);
  cJSON_Delete(root);
  cJSON_Delete(out);
  return s;
}
