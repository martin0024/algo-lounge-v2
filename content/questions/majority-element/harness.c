#include "cJSON.h"
#include <stdlib.h>

int majorityElement(int *nums, int numsSize);

char *al_solve(const char *args_json) {
  cJSON *root = cJSON_Parse(args_json);
  cJSON *jn = cJSON_GetArrayItem(root, 0);
  int n = cJSON_GetArraySize(jn);
  int *nums = (int *)malloc(sizeof(int) * (n > 0 ? n : 1));
  for (int i = 0; i < n; i++)
    nums[i] = (int)cJSON_GetArrayItem(jn, i)->valuedouble;

  cJSON *out = cJSON_CreateNumber(majorityElement(nums, n));
  char *s = cJSON_PrintUnformatted(out);

  free(nums);
  cJSON_Delete(root);
  cJSON_Delete(out);
  return s;
}
