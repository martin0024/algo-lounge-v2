import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonParser;

public class Main {
    public static void main(String[] args) throws Exception {
        JsonArray in = JsonParser.parseString(args[0]).getAsJsonArray();
        JsonArray jn = in.get(0).getAsJsonArray();
        int[] nums = new int[jn.size()];
        for (int i = 0; i < jn.size(); i++) nums[i] = jn.get(i).getAsInt();

        int[] result = new Solution().productExceptSelf(nums);
        System.out.println(new Gson().toJson(result));
    }
}
