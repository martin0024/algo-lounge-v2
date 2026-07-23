import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonParser;

public class Main {
    public static void main(String[] args) throws Exception {
        JsonArray in = JsonParser.parseString(args[0]).getAsJsonArray();
        JsonArray jsonNums = in.get(0).getAsJsonArray();
        int[] nums = new int[jsonNums.size()];
        for (int i = 0; i < jsonNums.size(); i++) {
            nums[i] = jsonNums.get(i).getAsInt();
        }
        int target = in.get(1).getAsInt();

        int[] result = new Solution().twoSum(nums, target);

        System.out.println(new Gson().toJson(result));
    }
}
