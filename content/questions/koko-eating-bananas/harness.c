#include "cJSON.h"
#include <stdlib.h>

int minEatingSpeed(int *piles, int pilesSize, int h);

char *al_solve(const char *args_json) {
  cJSON *root = cJSON_Parse(args_json);
  cJSON *jp = cJSON_GetArrayItem(root, 0);
  int n = cJSON_GetArraySize(jp);
  int *piles = (int *)malloc(sizeof(int) * (n > 0 ? n : 1));
  for (int i = 0; i < n; i++)
    piles[i] = (int)cJSON_GetArrayItem(jp, i)->valuedouble;
  int h = (int)cJSON_GetArrayItem(root, 1)->valuedouble;

  cJSON *out = cJSON_CreateNumber(minEatingSpeed(piles, n, h));
  char *s = cJSON_PrintUnformatted(out);

  free(piles);
  cJSON_Delete(root);
  cJSON_Delete(out);
  return s;
}
