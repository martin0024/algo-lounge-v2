#include "cJSON.h"
#include <stdlib.h>

int largestRectangleInHistogram(int *heights, int heightsSize);

char *al_solve(const char *args_json) {
  cJSON *root = cJSON_Parse(args_json);
  cJSON *jh = cJSON_GetArrayItem(root, 0);
  int n = cJSON_GetArraySize(jh);
  int *heights = (int *)malloc(sizeof(int) * (n > 0 ? n : 1));
  for (int i = 0; i < n; i++)
    heights[i] = (int)cJSON_GetArrayItem(jh, i)->valuedouble;

  cJSON *out = cJSON_CreateNumber(largestRectangleInHistogram(heights, n));
  char *s = cJSON_PrintUnformatted(out);

  free(heights);
  cJSON_Delete(root);
  cJSON_Delete(out);
  return s;
}
